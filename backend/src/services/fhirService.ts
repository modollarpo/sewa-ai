// SEWA XAI — backend/src/services/fhirService.ts
// FHIR R4 integration — Azure Healthcare APIs (production) or HAPI FHIR (local dev)
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
//
// CREDENTIAL SOURCES (in priority order):
//   Production  → Azure Healthcare APIs (Azure API for FHIR / Azure Health Data Services)
//                 Credentials: App Registration in same Azure AD tenant as AKS cluster
//                 FHIR_BASE_URL    = https://<workspace>-<fhir-service>.fhir.azurehealthcareapis.com
//                 FHIR_TENANT_ID   = your Azure AD tenant ID (same as AZURE_TENANT_ID)
//                 FHIR_CLIENT_ID   = App Registration client ID (granted FHIR Data Contributor role)
//                 FHIR_CLIENT_SECRET = App Registration client secret
//
//   Local dev   → HAPI FHIR JPA Server (docker-compose service "fhir-server")
//                 FHIR_BASE_URL    = http://localhost:8080/fhir
//                 FHIR_TENANT_ID   = (leave blank — HAPI uses no auth)
//                 FHIR_CLIENT_ID   = (leave blank)
//                 FHIR_CLIENT_SECRET = (leave blank)
//
//   Disabled    → leave FHIR_BASE_URL blank — all calls silently no-op

import axios from 'axios';
import { config } from '../config/env';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { validateNhsNumber } from '../utils/nhsNumber';
import type {
  ImagingStudy,
  Observation,
  DiagnosticReport,
  Patient,
  Practitioner,
  Organization,
  Bundle,
  OperationOutcome,
  Provenance,
  Consent
} from 'fhir/r4';

/**
 * Create a FHIR OperationOutcome resource for standardized error handling
 * @param severity Error severity: fatal | error | warning | information
 * @param code Error code (FHIR terminology)
 * @param details Human-readable error message
 * @param diagnostics Optional diagnostic details
 * @returns FHIR OperationOutcome resource
 */
export function createOperationOutcome(
  severity: 'fatal' | 'error' | 'warning' | 'information',
  code:
    | 'invalid'
    | 'structure'
    | 'required'
    | 'value'
    | 'invariant'
    | 'security'
    | 'login'
    | 'unknown'
    | 'expired'
    | 'forbidden'
    | 'suppressed'
    | 'processing'
    | 'not-supported'
    | 'duplicate'
    | 'multiple-matches'
    | 'not-found'
    | 'deleted'
    | 'too-long'
    | 'code-invalid'
    | 'extension'
    | 'too-costly'
    | 'business-rule'
    | 'conflict'
    | 'transient'
    | 'lock-error'
    | 'no-store'
    | 'exception'
    | 'timeout'
    | 'incomplete'
    | 'throttled'
    | 'informational',
  details: string,
  diagnostics?: string
): OperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity,
        code,
        details: { text: details },
        diagnostics
      }
    ]
  };
}

// ── Guard: if no FHIR server configured, all functions no-op ────────────
function fhirEnabled(): boolean {
  return Boolean(config.FHIR_BASE_URL);
}

// ── Token management (Azure AD client credentials, skipped for HAPI) ────
let fhirToken: string | null = null;
let tokenExpiry = 0;

async function getFHIRToken(): Promise<string | null> {
  // No auth needed for local HAPI FHIR server
  if (!config.FHIR_TENANT_ID || !config.FHIR_CLIENT_ID || !config.FHIR_CLIENT_SECRET) {
    return null;
  }
  if (fhirToken && Date.now() < tokenExpiry) return fhirToken;

  const res = await axios.post(
    `https://login.microsoftonline.com/${config.FHIR_TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     config.FHIR_CLIENT_ID,
      client_secret: config.FHIR_CLIENT_SECRET,
      scope:         `${config.FHIR_BASE_URL}/.default`,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  fhirToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return fhirToken!;
}

function buildHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/fhir+json',
    'Accept':       'application/fhir+json',
  };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function client() {
  return axios.create({ baseURL: config.FHIR_BASE_URL });
}

// ── ImagingStudy ─────────────────────────────────────────────────────────
export async function createFHIRImagingStudy(scan: any): Promise<string | null> {
  if (!fhirEnabled()) return null;
  if (!scan.patientId) {
    logger.warn(`[FHIR] Cannot create ImagingStudy: no patient ID for scan ${scan.id}`);
    return null;
  }
  try {
    const token = await getFHIRToken();
    const resource: ImagingStudy = {
      resourceType: 'ImagingStudy',
      status: 'available',
      subject: { reference: `Patient/${scan.patient?.fhirId}` },
      started: scan.receivedAt,
      modality: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: scan.modality }],
      description: `${scan.modality} ${scan.bodyPart} — SEWA XAI`,
      identifier: scan.dicomStudyUid
        ? [{ system: 'urn:dicom:uid', value: `urn:oid:${scan.dicomStudyUid}` }]
        : [],
      series: [{
        uid: scan.dicomSeriesUid || '1.2.3.4.5', // Default if missing in simplified schema
        modality: { system: 'http://dicom.nema.org/resources/ontology/DCM', code: scan.modality },
        bodySite: { display: scan.bodyPart },
        instance: scan.dicomInstanceUid ? [{
          uid: scan.dicomInstanceUid,
          sopClass: { system: 'urn:ietf:rfc:3986', code: 'urn:oid:1.2.840.10008.5.1.4.1.1.2' },
        }] : [],
      }],
    };
    const res = await client().post('/ImagingStudy', resource, { headers: buildHeaders(token) });
    logger.info(`[FHIR] ImagingStudy created: ${res.data.id} for scan ${scan.id}`);
    return res.data.id;
  } catch (err: any) {
    logger.warn(`[FHIR] ImagingStudy creation failed: ${err.message}`);
    return null;
  }
}

// ── Observation ──────────────────────────────────────────────────────────
export async function createFHIRObservation(scan: any, aiResult: any): Promise<string | null> {
  if (!fhirEnabled()) return null;
  if (!scan.patientId) {
    logger.warn(`[FHIR] Cannot create Observation: no patient ID for scan ${scan.id}`);
    return null;
  }
  try {
    const token = await getFHIRToken();
    const resource: Observation = {
      resourceType: 'Observation',
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'imaging' }] }],
      code: { text: aiResult.primaryFinding || 'AI Inference Result' },
      subject: { reference: `Patient/${scan.patient?.fhirId}` },
      effectiveDateTime: scan.receivedAt,
      valueQuantity: aiResult.confidence ? {
        value: aiResult.confidence * 100,
        unit: '%',
        system: 'http://unitsofmeasure.org',
        code: '%'
      } : undefined,
      device: { display: `SEWA XAI Triage Engine ${aiResult.modelVersion || 'v2.4.1'}` },
      note: aiResult.location ? [{ text: `Finding location: ${aiResult.location}` }] : [],
    };
    const res = await client().post('/Observation', resource, { headers: buildHeaders(token) });
    logger.info(`[FHIR] Observation created: ${res.data.id} for scan ${scan.id}`);
    return res.data.id;
  } catch (err: any) {
    logger.warn(`[FHIR] Observation creation failed: ${err.message}`);
    return null;
  }
}

// ── DiagnosticReport ─────────────────────────────────────────────────────
export async function createFHIRDiagnosticReport(report: any, scan: any, observationIds: string[] = []): Promise<string | null> {
  if (!fhirEnabled()) return null;
  if (!scan.patientId) {
    logger.warn(`[FHIR] Cannot create DiagnosticReport: no patient ID for scan ${scan.id}`);
    return null;
  }
  try {
    const token = await getFHIRToken();
    const resource: DiagnosticReport = {
      resourceType: 'DiagnosticReport',
      status: 'final',
      code: {
        coding: [{ system: 'http://loinc.org', code: '18748-4', display: 'Diagnostic imaging study' }],
      },
      subject: { reference: `Patient/${scan.patient?.fhirId}` },
      issued: report.createdAt.toISOString(),
      performer: [{ reference: `Practitioner/${report.authorId}` }],
      result: observationIds.map(id => ({ reference: `Observation/${id}` })),
      conclusion: report.summary || 'Study complete.',
      conclusionCode: scan.aiResult?.primaryFinding
        ? [{ text: scan.aiResult.primaryFinding }]
        : [],
      presentedForm: [
        {
          contentType: 'text/markdown',
          data: Buffer.from(report.content).toString('base64'),
          title: 'Radiology Report',
        }
      ],
    };
    const res = await client().post('/DiagnosticReport', resource, { headers: buildHeaders(token) });
    logger.info(`[FHIR] DiagnosticReport created: ${res.data.id} for report ${report.id}`);
    return res.data.id;
  } catch (err: any) {
    logger.warn(`[FHIR] DiagnosticReport creation failed: ${err.message}`);
    return null;
  }
}

// ── Patient ──────────────────────────────────────────────────────────────
export async function getFHIRPatient(fhirId: string): Promise<Patient | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const res = await client().get<Patient>(`/Patient/${fhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] Patient fetch failed: ${err.message}`);
    return null;
  }
}

// ── ImagingStudy GET ─────────────────────────────────────────────────────
export async function getFHIRImagingStudy(fhirId: string): Promise<ImagingStudy | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const res = await client().get<ImagingStudy>(`/ImagingStudy/${fhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] ImagingStudy fetch failed: ${err.message}`);
    return null;
  }
}

// ── DiagnosticReport GET ──────────────────────────────────────────
export async function getFHIRDiagnosticReport(fhirId: string): Promise<DiagnosticReport | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const res = await client().get<DiagnosticReport>(`/DiagnosticReport/${fhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] DiagnosticReport fetch failed: ${err.message}`);
    return null;
  }
}

// ── Observation GET ───────────────────────────────────────────────
export async function getFHIRObservation(fhirId: string): Promise<Observation | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const res = await client().get<Observation>(`/Observation/${fhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] Observation fetch failed: ${err.message}`);
    return null;
  }
}

// ── Search DiagnosticReports ──────────────────────────────────────
export async function searchFHIRDiagnosticReports(patientFhirId: string): Promise<Bundle> {
  if (!fhirEnabled()) return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  try {
    const token = await getFHIRToken();
    const res = await client().get<Bundle>(`/DiagnosticReport?subject=Patient/${patientFhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] DiagnosticReport search failed: ${err.message}`);
    return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  }
}

// ── Search Conditions (History) ───────────────────────────────────
export async function searchFHIRConditions(patientFhirId: string): Promise<Bundle> {
  if (!fhirEnabled()) return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  try {
    const token = await getFHIRToken();
    const res = await client().get<Bundle>(`/Condition?subject=Patient/${patientFhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] Condition search failed: ${err.message}`);
    return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  }
}

// ── Search Observations (Labs) ────────────────────────────────────
export async function searchFHIRObservations(patientFhirId: string, category: string = 'vital-signs,laboratory'): Promise<Bundle> {
  if (!fhirEnabled()) return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  try {
    const token = await getFHIRToken();
    const res = await client().get<Bundle>(`/Observation?subject=Patient/${patientFhirId}&category=${category}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FX] Observation search failed: ${err.message}`);
    return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  }
}

// ── Practitioner Mapping ──────────────────────────────────────────
export async function getFHIRPractitioner(userId: string): Promise<Practitioner | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return {
    resourceType: 'Practitioner',
    id: user.id,
    identifier: [{ system: 'https://sewaxai.health/users', value: user.id }],
    name: [{ family: user.lastName, given: [user.firstName] }],
    telecom: [{ system: 'email', value: user.email }],
    qualification: user.speciality ? [{ code: { text: user.speciality } }] : [],
  };
}

// ── Organization Mapping ──────────────────────────────────────────
export async function getFHIROrganization(tenantId: string): Promise<Organization | null> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return null;
  const contact: Organization['contact'] = [];
  if (tenant.primaryContactEmail) {
    contact.push({
      telecom: [{ system: 'email' as const, value: tenant.primaryContactEmail }]
    });
  }
  return {
    resourceType: 'Organization',
    id: tenant.id,
    name: tenant.name,
    address: [{ city: tenant.region || 'UK' }],
    contact: contact.length > 0 ? contact : undefined,
  };
}

// ── Consent ───────────────────────────────────────────────────────────────
/**
 * Create a FHIR Consent resource (UKCore compatible)
 * @param patientId The patient's FHIR ID
 * @param consentScope Consent scope (e.g., "patient-privacy")
 * @param consentStatus Consent status (e.g., "active", "inactive")
 * @param consentCategory Consent category (e.g., "research", "treatment")
 * @param organizationId Optional organization ID
 * @param period Optional consent period (embedded in provision)
 * @returns Promise of the created Consent ID or null
 */
export async function createFHIRConsent(
  patientId: string,
  consentScope: string = 'patient-privacy',
  consentStatus: 'active' | 'inactive' | 'entered-in-error' = 'active',
  consentCategory: string = 'treatment',
  organizationId?: string,
  period?: { start: string; end?: string }
): Promise<string | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const resource: Consent = {
      resourceType: 'Consent',
      status: consentStatus,
      scope: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/consentscope',
            code: consentScope,
            display: consentScope === 'patient-privacy' ? 'Privacy Consent' : 'Treatment Consent'
          }
        ]
      },
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
              code: consentCategory,
              display: consentCategory === 'research' ? 'Research' : 'Treatment'
            }
          ]
        }
      ],
      patient: { reference: `Patient/${patientId}` },
      dateTime: new Date().toISOString(),
      organization: organizationId ? [{ reference: `Organization/${organizationId}` }] : undefined,
      provision: period ? {
        period: {
          start: period.start,
          end: period.end
        }
      } : undefined
    };
    const res = await client().post('/Consent', resource, { headers: buildHeaders(token) });
    logger.info(`[FHIR] Consent created: ${res.data.id} for patient: ${patientId}`);
    return res.data.id;
  } catch (err: any) {
    logger.warn(`[FHIR] Consent creation failed: ${err.message}`);
    return null;
  }
}

/**
 * Get a FHIR Consent resource by ID
 * @param consentId The Consent ID
 * @returns Promise of the Consent resource or null
 */
export async function getFHIRConsent(consentId: string): Promise<Consent | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const res = await client().get<Consent>(`/Consent/${consentId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] Consent fetch failed: ${err.message}`);
    return null;
  }
}

/**
 * Update a FHIR Consent resource
 * @param consentId The Consent ID
 * @param updates Partial Consent updates
 * @returns Promise of the updated Consent ID or null
 */
export async function updateFHIRConsent(
  consentId: string,
  updates: Partial<Consent>
): Promise<string | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const current = await getFHIRConsent(consentId);
    if (!current) return null;

    const updated = { ...current, ...updates };
    const res = await client().put(`/Consent/${consentId}`, updated, { headers: buildHeaders(token) });
    logger.info(`[FHIR] Consent updated: ${res.data.id}`);
    return res.data.id;
  } catch (err: any) {
    logger.warn(`[FHIR] Consent update failed: ${err.message}`);
    return null;
  }
}

/**
 * Search for Consent resources by patient ID
 * @param patientId The patient's FHIR ID
 * @returns Promise of a Bundle of Consent resources
 */
export async function searchFHIRConsents(patientId: string): Promise<Bundle> {
  if (!fhirEnabled()) return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  try {
    const token = await getFHIRToken();
    const res = await client().get<Bundle>(`/Consent?patient=Patient/${patientId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] Consent search failed: ${err.message}`);
    return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  }
}

// ── Provenance ───────────────────────────────────────────────────────────
export async function createFHIRProvenance(
  targetIds: string[],
  agentName: string,
  agentType: 'device' | 'practitioner' | 'organization' = 'device',
  activity: string = 'create'
): Promise<string | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const resource: Provenance = {
      resourceType: 'Provenance',
      target: targetIds.map(id => ({ reference: id })),
      recorded: new Date().toISOString(),
      agent: [
        {
          who: {
            reference: agentType === 'device' ? `Device/${agentName}` :
                      agentType === 'practitioner' ? `Practitioner/${agentName}` :
                      `Organization/${agentName}`,
            display: agentName
          }
        }
      ],
      activity: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-DataOperation',
            code: activity.toUpperCase(),
            display: activity === 'create' ? 'Create' :
                     activity === 'update' ? 'Update' :
                     activity === 'delete' ? 'Delete' : 'Query'
          }
        ]
      }
    };
    const res = await client().post('/Provenance', resource, { headers: buildHeaders(token) });
    logger.info(`[FHIR] Provenance created: ${res.data.id} for targets: ${targetIds.join(', ')}`);
    return res.data.id;
  } catch (err: any) {
    logger.warn(`[FHIR] Provenance creation failed: ${err.message}`);
    return null;
  }
}

// ── Bundle ───────────────────────────────────────────────────────────────
/**
 * Create a FHIR Bundle (transaction or batch)
 * @param entries Array of BundleEntry resources
 * @param type Bundle type (default: "transaction")
 * @returns FHIR Bundle resource
 */
export function createFHIRBundle(
  entries: Bundle['entry'],
  type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection' = 'transaction'
): Bundle {
  return {
    resourceType: 'Bundle',
    type,
    timestamp: new Date().toISOString(),
    entry: entries
  };
}

/**
 * Create a BundleEntry for a resource
 * @param resource The FHIR resource
 * @param method HTTP method (POST, PUT, DELETE, GET)
 * @param fullUrl Optional full URL
 * @returns BundleEntry
 */
export function createFHIRBundleEntry(
  resource: any,
  method: 'POST' | 'PUT' | 'DELETE' | 'GET' = 'POST',
  fullUrl?: string
): NonNullable<Bundle['entry']>[0] {
  const entry: any = {
    resource
  };
  if (method !== 'GET') {
    entry.request = {
      method,
      url: resource.resourceType
    };
  }
  if (fullUrl) {
    entry.fullUrl = fullUrl;
  }
  return entry;
}

/**
 * Submit a FHIR Bundle to the FHIR server
 * @param bundle The Bundle to submit
 * @returns Promise of the response Bundle or null
 */
export async function submitFHIRBundle(bundle: Bundle): Promise<Bundle | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const res = await client().post('/', bundle, { headers: buildHeaders(token) });
    logger.info(`[FHIR] Bundle submitted successfully with ${bundle.entry?.length || 0} entries`);
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] Bundle submission failed: ${err.message}`);
    return null;
  }
}

// ── Bulk Data Export ─────────────────────────────────────────────────────────
/**
 * Initiate a FHIR Bulk Data Export (https://hl7.org/fhir/uv/bulkdata/)
 * @param exportType Type of export: "patient", "group", or "system"
 * @param groupId For group export, the Group resource ID
 * @param types Comma-separated list of resource types to export
 * @returns Promise of the export status polling URL or null
 */
export async function initiateFHIRBulkExport(
  exportType: 'patient' | 'group' | 'system' = 'patient',
  groupId?: string,
  types?: string
): Promise<string | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    let url = '';
    if (exportType === 'patient') {
      url = '/Patient/$export';
    } else if (exportType === 'group' && groupId) {
      url = `/Group/${groupId}/$export`;
    } else if (exportType === 'system') {
      url = '/$export';
    } else {
      throw new Error('Invalid export type or missing group ID');
    }
    const params = new URLSearchParams();
    if (types) params.set('_type', types);
    const res = await client().get(url, {
      params,
      headers: { ...buildHeaders(token), Accept: 'application/fhir+json' }
    });
    // The Content-Location header contains the polling URL
    const pollingUrl = res.headers['content-location'];
    logger.info(`[FHIR] Bulk export initiated: polling URL = ${pollingUrl}`);
    return pollingUrl;
  } catch (err: any) {
    logger.warn(`[FHIR] Failed to initiate bulk export: ${err.message}`);
    return null;
  }
}

/**
 * Poll a FHIR Bulk Data Export job for status
 * @param pollingUrl The URL to poll (from Content-Location header)
 * @returns Promise of the status (either "accepted", "in-progress", "completed", or "error")
 */
export async function pollFHIRBulkExport(
  pollingUrl: string
): Promise<{ status: 'accepted' | 'in-progress' | 'completed' | 'error'; output?: any[]; error?: any }> {
  if (!fhirEnabled()) return { status: 'error', error: 'FHIR not enabled' };
  try {
    const token = await getFHIRToken();
    const res = await client().get(pollingUrl, {
      headers: { ...buildHeaders(token), Accept: 'application/fhir+json' }
    });
    if (res.status === 200) {
      // Export complete!
      return { status: 'completed', output: res.data.output };
    } else if (res.status === 202) {
      // Still in progress
      return { status: res.headers['x-progress'] === '100%' ? 'in-progress' : 'accepted' };
    } else {
      return { status: 'error', error: res.data };
    }
  } catch (err: any) {
    logger.warn(`[FHIR] Failed to poll bulk export: ${err.message}`);
    return { status: 'error', error: err.message };
  }
}

/**
 * Cancel a FHIR Bulk Data Export job
 * @param pollingUrl The polling URL of the export to cancel
 * @returns Promise of boolean (true if canceled successfully)
 */
export async function cancelFHIRBulkExport(pollingUrl: string): Promise<boolean> {
  if (!fhirEnabled()) return false;
  try {
    const token = await getFHIRToken();
    await client().delete(pollingUrl, { headers: buildHeaders(token) });
    logger.info(`[FHIR] Bulk export canceled successfully`);
    return true;
  } catch (err: any) {
    logger.warn(`[FHIR] Failed to cancel bulk export: ${err.message}`);
    return false;
  }
}

  // ── NHS PDS (Patient Demographic Service) ─────────────────────────────────
/**
 * Search NHS PDS for a patient using NHS Number
 * @param nhsNumber The NHS Number to search for
 * @returns Promise of the Patient resource or null
 */
export async function searchNhsPdsByNhsNumber(nhsNumber: string): Promise<Patient | null> {
  if (!config.NHS_PDS_URL || !config.NHS_PDS_API_KEY) {
    logger.warn('[FHIR] NHS PDS not configured');
    return null;
  }
  if (!validateNhsNumber(nhsNumber)) {
    logger.warn(`[FHIR] Invalid NHS Number: ${nhsNumber}`);
    return null;
  }
  try {
    const res = await axios.get(`${config.NHS_PDS_URL}/Patient`, {
      params: { identifier: `https://fhir.nhs.uk/Id/nhs-number|${nhsNumber}` },
      headers: {
        'Authorization': `Bearer ${config.NHS_PDS_API_KEY}`,
        'Accept': 'application/fhir+json'
      }
    });
    // Get first matching patient
    if (res.data.resourceType === 'Bundle' && res.data.entry?.length > 0) {
      return res.data.entry[0].resource;
    }
    return null;
  } catch (err: any) {
    logger.warn(`[FHIR] Failed to search NHS PDS: ${err.message}`);
    return null;
  }
}

/**
 * Retrieve a patient from NHS PDS by their logical ID
 * @param pdsPatientId The PDS patient ID
 * @returns Promise of the Patient resource or null
 */
export async function getNhsPdsPatient(pdsPatientId: string): Promise<Patient | null> {
  if (!config.NHS_PDS_URL || !config.NHS_PDS_API_KEY) {
    logger.warn('[FHIR] NHS PDS not configured');
    return null;
  }
  try {
    const res = await axios.get(`${config.NHS_PDS_URL}/Patient/${pdsPatientId}`, {
      headers: {
        'Authorization': `Bearer ${config.NHS_PDS_API_KEY}`,
        'Accept': 'application/fhir+json'
      }
    });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] Failed to get NHS PDS patient: ${err.message}`);
    return null;
  }
}

// ── Health check ─────────────────────────────────────────────────────────
export async function checkFHIRHealth(): Promise<{ enabled: boolean; reachable: boolean; server: string }> {
  if (!fhirEnabled()) return { enabled: false, reachable: false, server: 'not configured' };
  try {
    await client().get('/metadata', { timeout: 5000 });
    return { enabled: true, reachable: true, server: config.FHIR_BASE_URL! };
  } catch {
    return { enabled: true, reachable: false, server: config.FHIR_BASE_URL! };
  }
}
