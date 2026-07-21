// services/clinicalAuditLogger.ts
import { apiClient } from './apiClient';
import { apiClient as externalApiClient } from 'axios';

export interface ClinicalActionLog {
  id: string;
  timestamp: Date;
  actionType: ClinicalActionType;
  userId: string;
  tenantId: string;
  patientId: string;
  scanId?: string;
  aiModel?: string;
  confidenceScore?: number;
  uncertaintyScore?: number;
  clinicalDecision?: string;
  clinicalVerification?: 'CONFIRMED' | 'PENDING' | 'REJECTED' | 'MONITORING';
  outcome?: string;
  regulatoryCompliance?: ComplianceStatus;
  auditTrail?: string;
  metadata?: Record<string, any>;
}

export interface ClinicalActionType {
  AI_ANALYSIS_COMPLETED: string;
  CONFIDENCE_VERIFICATION: string;
  CLINICAL_CONFIRMATION: string;
  SECOND_OPINION_REQUESTED: string;
  PATIENT_CONSENT_OBTAINED: string;
  ENCRYPTION_APPLIED: string;
  DATA_ACCESS_LOGGED: string;
  AUDIT_EXPORT_GENERATED: string;
}

export interface ComplianceStatus {
  gdpr: 'COMPLIANT' | 'IN_PROGRESS' | 'VIOLATION';
  hipaa: 'COMPLIANT' | 'IN_PROGRESS' | 'VIOLATION';
  ukca: 'CE_MARKED' | 'CE_IN_PROGRESS' | 'CE_NOT_APPLICABLE';
  overall: 'COMPLIANT' | 'MONITORING' | 'NON_COMPLIANT';
  lastChecked: Date;
  nextReview: Date;
}

export interface PatientConsentRecord {
  id: string;
  patientId: string;
  consentType: 'DATA_PROCESSING' | 'AI_ANALYSIS' | 'RESEARCH' | 'SHARING';
  grantedAt: Date;
  version: string;
  ipAddress: string;
  userAgent: string;
  tokenizedHash: string;
}

export interface EncryptionAuditLog {
  id: string;
  timestamp: Date;
  patientId: string;
  scanId?: string;
  encryptionAlgorithm: 'AES-256' | 'RSA-2048' | 'AES-128';
  keyRotationId: string;
  accessAttemptId?: string;
  dataAtRest: boolean;
  dataInTransit: boolean;
}

export class ClinicalAuditLogger {
  private static instance: ClinicalAuditLogger;
  private baseLogLevel: LogLevel = 'INFO';
  private encryptionAuditEnabled = true;
  private complianceMonitoringEnabled = true;
  private auditRetentionDays = 3650; // 10 years

  constructor() {
    if (ClinicalAuditLogger.instance) {
      throw new Error('Use ClinicalAuditLogger.getInstance()');
    }
  }

  static getInstance(): ClinicalAuditLogger {
    if (!ClinicalAuditLogger.instance) {
      ClinicalAuditLogger.instance = new ClinicalAuditLogger();
    }
    return ClinicalAuditLogger.instance;
  }

  async logClinicalAction(action: ClinicalActionLog): Promise<void> {
    try {
      const enrichedAction = await this.enrichClinicalAction(action);
      await this.persistToPrimaryStore(enrichedAction);
      await this.emitToRealTimeStreams('clinical_action', enrichedAction);
      await this.validateCompliance(enrichedAction);
    } catch (error) {
      console.error('Clinical action logging failed:', error);
      throw new Error(`Failed to log clinical action: ${(error as Error).message}`);
    }
  }

  async logPatientConsent(consent: PatientConsentRecord): Promise<void> {
    try {
      await this.persistToPrimaryStore({
        id: `consent-${consent.id}`,
        timestamp: new Date(),
        actionType: 'PATIENT_CONSENT_OBTAINED',
        userId: consent.patientId,
        tenantId: 'system',
        patientId: consent.patientId,
        metadata: {
          consentType: consent.consentType,
          version: consent.version,
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
          tokenizedHash: consent.tokenizedHash,
        },
      } as ClinicalActionLog);
      await this.emitComplianceEvent('consent_obtained', consent);
    } catch (error) {
      console.error('Patient consent logging failed:', error);
    }
  }

  async logEncryptionAudit(audit: EncryptionAuditLog): Promise<void> {
    try {
      if (!this.encryptionAuditEnabled) return;
      
      await this.persistToPrimaryStore({
        id: audit.id,
        timestamp: audit.timestamp,
        actionType: 'ENCRYPTION_APPLIED',
        userId: 'system',
        tenantId: 'system',
        patientId: audit.patientId,
        scanId: audit.scanId,
        metadata: {
          algorithm: audit.encryptionAlgorithm,
          keyRotationId: audit.keyRotationId,
          atRest: audit.dataAtRest,
          inTransit: audit.dataInTransit,
        },
      } as ClinicalActionLog);
    } catch (error) {
      console.error('Encryption audit logging failed:', error);
    }
  }

  async getComplianceReport(
    dateRange: { start: Date; end: Date },
    patientId?: string,
    actionTypes?: ClinicalActionType
  ): Promise<{ complianceStats: ComplianceStatus; auditLogs: ClinicalActionLog[] }> {
    try {
      const queryParams = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      if (patientId) queryParams.append('patientId', patientId);
      if (actionTypes) queryParams.append('actionTypes', JSON.stringify(actionTypes));

      const response = await apiClient.get(
        `/clinical/audit/report?${queryParams.toString()}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Compliance report fetch failed:', error);
      throw error;
    }
  }

  async exportAuditLogs(
    filters: {
      dateRange: { start: Date; end: Date };
      patientId?: string;
      actionTypes?: ClinicalActionType;
      includeEncrypted?: boolean;
    },
    format: 'JSON' | 'CSV' | 'PDF' = 'JSON'
  ): Promise<{ downloadUrl: string; fileName: string; expiresAt: Date }> {
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    try {
      const response = await apiClient.post('/clinical/audit/export', {
        filters,
        format,
        exportId,
        encryptionKeyId: this.encryptionAuditEnabled ? 'current_kr_001' : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('Audit export failed:', error);
      throw error;
    }
  }

  async validateCompliance(action: ClinicalActionLog): Promise<ComplianceStatus> {
    try {
      const complianceCheck = await apiClient.post('/clinical/audit/compliance/validate', {
        action,
      });
      return complianceCheck.data.complianceStatus;
    } catch (error) {
      console.error('Compliance validation failed:', error);
      return {
        gdpr: 'VIOLATION',
        hipaa: 'VIOLATION',
        ukca: 'CE_NOT_APPLICABLE',
        overall: 'NON_COMPLIANT',
        lastChecked: new Date(),
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }
  }

  private async enrichClinicalAction(action: ClinicalActionLog): Promise<ClinicalActionLog> {
    const enriched: ClinicalActionLog = {
      ...action,
      id: action.id || `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: action.timestamp || new Date(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      ipAddress: await this.getCurrentIP(),
      auditTrail: [],
      regulatoryCompliance: {
        gdpr: 'COMPLIANT',
        hipaa: 'COMPLIANT',
        ukca: 'CE_MARKED',
        overall: 'COMPLIANT',
        lastChecked: new Date(),
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }

    return enriched;
  }

  private async persistToPrimaryStore(action: ClinicalActionLog): Promise<void> {
    await apiClient.post('/clinical/audit/log', action);
  }

  private async emitToRealTimeStreams(eventType: string, data: ClinicalActionLog): Promise<void> {
    await apiClient.post('/clinical/audit/real-time-stream', {
      eventType,
      data,
      timestamp: new Date(),
      streamId: 'compliance_audit_stream',
    });
  }

  private async emitComplianceEvent(eventType: string, data: PatientConsentRecord | EncryptionAuditLog): Promise<void> {
    await apiClient.post('/clinical/compliance/events', {
      eventType,
      data,
      timestamp: new Date(),
      complianceId: `compliance_event_${Date.now()}`,
    });
  }

  private async getCurrentIP(): Promise<string> {
    try {
      const response = await externalApiClient.get('https://ipapi.co/json/');
      return response.data.ip;
    } catch {
      return '192.0.2.1'; // Fallback IP for testing
    }
  }

  updateConfiguration(config: Partial<ClinicalAuditLogger>): void {
    Object.assign(this, config);
    console.log('Clinical audit configuration updated:', config);
  }
}

export default ClinicalAuditLogger;