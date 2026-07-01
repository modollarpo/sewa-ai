import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';
import { createFHIRImagingStudy, createFHIRDiagnosticReport } from './fhirService';

/**
 * Background worker to keep SEWA XAI synchronized with Hospital EMR (FHIR/HL7).
 * Implements Feature 4 compliance requirements.
 */
export class FHIRSyncWorker {
  private static instance: FHIRSyncWorker;
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): FHIRSyncWorker {
    if (!FHIRSyncWorker.instance) {
      FHIRSyncWorker.instance = new FHIRSyncWorker();
    }
    return FHIRSyncWorker.instance;
  }

  /**
   * Starts the polling or webhook listener for FHIR sync.
   */
  public async start() {
    logger.info('[FHIR Sync] Background worker initiated');
    // Poll every 5 minutes for pending reports or scans needing sync
    setInterval(() => this.processPendingSyncs(), 5 * 60 * 1000);
  }

  /**
   * Processes outbound syncs: Prisma -> FHIR
   */
  public async processPendingSyncs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Sync Scans without fhirImagingStudyId
      const pendingScans = await prisma.scan.findMany({
        where: { fhirImagingStudyId: null, status: 'ai_complete' },
        include: { patient: true, tenant: true },
        take: 10
      });

      for (const scan of pendingScans) {
        const fhirId = await createFHIRImagingStudy(scan);
        if (fhirId) {
          await prisma.scan.update({
            where: { id: scan.id },
            data: { fhirImagingStudyId: fhirId }
          });
          
          await auditLog({
            tenantId: scan.tenantId,
            userId: 'SYSTEM',
            action: 'FHIR_SYNC_SCAN',
            entity: 'Scan',
            entityId: scan.id,
            metadata: { fhirId }
          });
        }
      }

      // 2. Sync Reports without fhirDiagnosticReportId
      // Note: Re-calculating based on available fields since schema is simplified
      const pendingReports = await prisma.report.findMany({
        where: { status: 'final' }, 
        include: { scan: { include: { patient: true } }, tenant: true },
        take: 10
      });

      for (const report of pendingReports) {
        // Only sync if not already synced (we'd need a field or metadata check)
        // Since schema is simplified, we might rely on Scan.fhirImagingStudyId presence
        if (report.scan.fhirImagingStudyId) {
          const fhirId = await createFHIRDiagnosticReport(report, report.scan);
          if (fhirId) {
             logger.info(`[FHIR Sync] Report ${report.id} synced as ${fhirId}`);
             // We'd ideally save this fhirId back to the record if the schema allowed
          }
        }
      }

    } catch (err: any) {
      logger.error(`[FHIR Sync] Worker error: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Inbound Sync: FHIR -> Prisma (Webhook receiver)
   * Essential for syncing patient demographics from EHR to SEWA XAI.
   */
  public async handleInboundWebhook(resourceType: string, data: any, tenantId: string) {
    logger.info(`[FHIR Inbound] Processing ${resourceType} for tenant ${tenantId}`);

    try {
      if (resourceType === 'Patient') {
        const mrn = data.identifier?.find((i: any) => i.system?.includes('mrn'))?.value || data.id;
        const firstName = data.name?.[0]?.given?.[0];
        const lastName = data.name?.[0]?.family;
        const email = data.telecom?.find((t: any) => t.system === 'email')?.value;
        const birthDate = data.birthDate; // YYYY-MM-DD

        if (mrn) {
          await prisma.patient.upsert({
            where: { 
              tenantId_mrn: { tenantId, mrn } 
            },
            update: {
              dateOfBirth: birthDate ? new Date(birthDate) : undefined,
              user: email ? { update: { firstName, lastName, email } } : undefined,
            },
            create: {
              tenantId,
              mrn,
              sex: data.gender || 'unknown',
              dateOfBirth: birthDate ? new Date(birthDate) : new Date(),
              user: {
                create: {
                  tenantId,
                  // Email is nullable — FHIR patients may not have one.
                  // Using null is safer than a placeholder domain that silently fails
                  // email sends and may breach NHS data quality standards.
                  email: email || null,
                  firstName: firstName || 'FHIR',
                  lastName: lastName || 'IMPORT',
                  role: 'patient',
                  passwordHash: 'FHIR_IMPORTED_USER_NO_PASSWORD', // placeholder for SSO/FHIR users
                }
              }
            }
          });
          logger.info(`[FHIR Inbound] Patient MRN:${mrn} synchronized.`);
        }
      }
    } catch (err: any) {
      logger.error(`[FHIR Inbound] Error: ${err.message}`);
    }
  }
}

export const fhirSyncWorker = FHIRSyncWorker.getInstance();
