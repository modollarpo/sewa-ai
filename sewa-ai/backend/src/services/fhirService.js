"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFHIRImagingStudy = createFHIRImagingStudy;
exports.createFHIRDiagnosticReport = createFHIRDiagnosticReport;
exports.getFHIRPatient = getFHIRPatient;
exports.getFHIRImagingStudy = getFHIRImagingStudy;
exports.checkFHIRHealth = checkFHIRHealth;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
// ── Guard: if no FHIR server configured, all functions no-op ────────────
function fhirEnabled() {
    return Boolean(env_1.config.FHIR_BASE_URL);
}
// ── Token management (Azure AD client credentials, skipped for HAPI) ────
let fhirToken = null;
let tokenExpiry = 0;
async function getFHIRToken() {
    // No auth needed for local HAPI FHIR server
    if (!env_1.config.FHIR_TENANT_ID || !env_1.config.FHIR_CLIENT_ID || !env_1.config.FHIR_CLIENT_SECRET) {
        return null;
    }
    if (fhirToken && Date.now() < tokenExpiry)
        return fhirToken;
    const res = await axios_1.default.post(`https://login.microsoftonline.com/${env_1.config.FHIR_TENANT_ID}/oauth2/v2.0/token`, new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env_1.config.FHIR_CLIENT_ID,
        client_secret: env_1.config.FHIR_CLIENT_SECRET,
        scope: `${env_1.config.FHIR_BASE_URL}/.default`,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    fhirToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
    return fhirToken;
}
function buildHeaders(token) {
    const h = {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
    };
    if (token)
        h['Authorization'] = `Bearer ${token}`;
    return h;
}
function client() {
    return axios_1.default.create({ baseURL: env_1.config.FHIR_BASE_URL });
}
// ── ImagingStudy ─────────────────────────────────────────────────────────
async function createFHIRImagingStudy(scan) {
    if (!fhirEnabled())
        return null;
    try {
        const token = await getFHIRToken();
        const resource = {
            resourceType: 'ImagingStudy',
            status: 'available',
            subject: scan.patientId ? { reference: `Patient/${scan.patient?.fhirId}` } : undefined,
            started: scan.receivedAt,
            modality: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: scan.modality }],
            description: `${scan.modality} ${scan.bodyPart} — SEWA AI`,
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
        logger_1.logger.info(`[FHIR] ImagingStudy created: ${res.data.id} for scan ${scan.id}`);
        return res.data.id;
    }
    catch (err) {
        logger_1.logger.warn(`[FHIR] ImagingStudy creation failed: ${err.message}`);
        return null;
    }
}
// ── DiagnosticReport ─────────────────────────────────────────────────────
async function createFHIRDiagnosticReport(report, scan) {
    if (!fhirEnabled())
        return null;
    try {
        const token = await getFHIRToken();
        const resource = {
            resourceType: 'DiagnosticReport',
            status: 'final',
            code: {
                coding: [{ system: 'http://loinc.org', code: '18748-4', display: 'Diagnostic imaging study' }],
            },
            subject: scan.patientId ? { reference: `Patient/${scan.patient?.fhirId}` } : undefined,
            issued: report.createdAt.toISOString(),
            performer: [{ reference: `Practitioner/${report.authorId}` }],
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
        logger_1.logger.info(`[FHIR] DiagnosticReport created: ${res.data.id} for report ${report.id}`);
        return res.data.id;
    }
    catch (err) {
        logger_1.logger.warn(`[FHIR] DiagnosticReport creation failed: ${err.message}`);
        return null;
    }
}
// ── Patient ──────────────────────────────────────────────────────────────
async function getFHIRPatient(fhirId) {
    if (!fhirEnabled())
        return null;
    try {
        const token = await getFHIRToken();
        const res = await client().get(`/Patient/${fhirId}`, { headers: buildHeaders(token) });
        return res.data;
    }
    catch (err) {
        logger_1.logger.warn(`[FHIR] Patient fetch failed: ${err.message}`);
        return null;
    }
}
// ── ImagingStudy GET ─────────────────────────────────────────────────────
async function getFHIRImagingStudy(fhirId) {
    if (!fhirEnabled())
        return null;
    try {
        const token = await getFHIRToken();
        const res = await client().get(`/ImagingStudy/${fhirId}`, { headers: buildHeaders(token) });
        return res.data;
    }
    catch (err) {
        logger_1.logger.warn(`[FHIR] ImagingStudy fetch failed: ${err.message}`);
        return null;
    }
}
// ── Health check ─────────────────────────────────────────────────────────
async function checkFHIRHealth() {
    if (!fhirEnabled())
        return { enabled: false, reachable: false, server: 'not configured' };
    try {
        await client().get('/metadata', { timeout: 5000 });
        return { enabled: true, reachable: true, server: env_1.config.FHIR_BASE_URL };
    }
    catch {
        return { enabled: true, reachable: false, server: env_1.config.FHIR_BASE_URL };
    }
}
