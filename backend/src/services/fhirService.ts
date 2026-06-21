// SEWA AI — backend/src/services/fhirService.ts
// FHIR R4 integration — Azure Healthcare APIs (production) or HAPI FHIR (local dev)
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
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
  try {
    const token = await getFHIRToken();
    const resource = {
      resourceType: 'ImagingStudy',
      status:       'available',
      subject:      scan.patientId ? { reference: `Patient/${scan.patient?.fhirId}` } : undefined,
      started:      scan.receivedAt,
      modality:     [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: scan.modality }],
      description:  `${scan.modality} ${scan.bodyPart} — SEWA AI`,
      identifier:   scan.dicomStudyUid
        ? [{ system: 'urn:dicom:uid', value: `urn:oid:${scan.dicomStudyUid}` }]
        : [],
      series: [{
        uid:      scan.dicomSeriesUid || '1.2.3.4.5', // Default if missing in simplified schema
        modality: { system: 'http://dicom.nema.org/resources/ontology/DCM', code: scan.modality },
        bodySite: { display: scan.bodyPart },
        instance: scan.dicomInstanceUid ? [{
          uid:      scan.dicomInstanceUid,
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
  try {
    const token = await getFHIRToken();
    const resource = {
      resourceType: 'Observation',
      status:       'final',
      category:     [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'imaging' }] }],
      code:         { text: aiResult.primaryFinding || 'AI Inference Result' },
      subject:      scan.patientId ? { reference: `Patient/${scan.patient?.fhirId}` } : undefined,
      effectiveDateTime: scan.receivedAt,
      valueQuantity: aiResult.confidence ? {
        value: aiResult.confidence * 100,
        unit:  '%',
        system: 'http://unitsofmeasure.org',
        code:   '%'
      } : undefined,
      device: { display: `SEWA AI Triage Engine ${aiResult.modelVersion || 'v2.4.1'}` },
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
  try {
    const token = await getFHIRToken();
    const resource = {
      resourceType: 'DiagnosticReport',
      status:       'final',
      code:         {
        coding: [{ system: 'http://loinc.org', code: '18748-4', display: 'Diagnostic imaging study' }],
      },
      subject:     scan.patientId ? { reference: `Patient/${scan.patient?.fhirId}` } : undefined,
      issued:      report.createdAt.toISOString(),
      performer:   [{ reference: `Practitioner/${report.authorId}` }],
      result:      observationIds.map(id => ({ reference: `Observation/${id}` })),
      conclusion:  report.summary || 'Study complete.',
      conclusionCode: scan.aiResult?.primaryFinding
        ? [{ text: scan.aiResult.primaryFinding }]
        : [],
      presentedForm: [
        {
          contentType: 'text/markdown',
          data:        Buffer.from(report.content).toString('base64'),
          title:       'Radiology Report',
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
export async function getFHIRPatient(fhirId: string): Promise<any | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const res = await client().get(`/Patient/${fhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] Patient fetch failed: ${err.message}`);
    return null;
  }
}

// ── ImagingStudy GET ─────────────────────────────────────────────────────
export async function getFHIRImagingStudy(fhirId: string): Promise<any | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const res = await client().get(`/ImagingStudy/${fhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] ImagingStudy fetch failed: ${err.message}`);
    return null;
  }
}

// ── DiagnosticReport GET ──────────────────────────────────────────
export async function getFHIRDiagnosticReport(fhirId: string): Promise<any | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const res = await client().get(`/DiagnosticReport/${fhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] DiagnosticReport fetch failed: ${err.message}`);
    return null;
  }
}

// ── Observation GET ───────────────────────────────────────────────
export async function getFHIRObservation(fhirId: string): Promise<any | null> {
  if (!fhirEnabled()) return null;
  try {
    const token = await getFHIRToken();
    const res = await client().get(`/Observation/${fhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] Observation fetch failed: ${err.message}`);
    return null;
  }
}

// ── Search DiagnosticReports ──────────────────────────────────────
export async function searchFHIRDiagnosticReports(patientFhirId: string): Promise<any> {
  if (!fhirEnabled()) return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  try {
    const token = await getFHIRToken();
    const res = await client().get(`/DiagnosticReport?subject=Patient/${patientFhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] DiagnosticReport search failed: ${err.message}`);
    return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  }
}

// ── Search Conditions (History) ───────────────────────────────────
export async function searchFHIRConditions(patientFhirId: string): Promise<any> {
  if (!fhirEnabled()) return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  try {
    const token = await getFHIRToken();
    const res = await client().get(`/Condition?subject=Patient/${patientFhirId}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FHIR] Condition search failed: ${err.message}`);
    return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  }
}

// ── Search Observations (Labs) ────────────────────────────────────
export async function searchFHIRObservations(patientFhirId: string, category: string = 'vital-signs,laboratory'): Promise<any> {
  if (!fhirEnabled()) return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  try {
    const token = await getFHIRToken();
    const res = await client().get(`/Observation?subject=Patient/${patientFhirId}&category=${category}`, { headers: buildHeaders(token) });
    return res.data;
  } catch (err: any) {
    logger.warn(`[FX] Observation search failed: ${err.message}`);
    return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
  }
}

// ── Practitioner Mapping ──────────────────────────────────────────
export async function getFHIRPractitioner(userId: string): Promise<any | null> {
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
export async function getFHIROrganization(tenantId: string): Promise<any | null> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return null;
  return {
    resourceType: 'Organization',
    id: tenant.id,
    name: tenant.name,
    address: [{ city: tenant.region || 'UK' }],
    contact: [{ telecom: [{ system: 'email', value: tenant.primaryContactEmail }] }],
  };
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
