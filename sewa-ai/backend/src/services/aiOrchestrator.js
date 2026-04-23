"use strict";
// SEWA AI — src/services/aiOrchestrator.ts
// Core AI Pipeline Orchestrator: Triage → Uncertainty → VLM → Metacognition
// Implements the 4-engine safety architecture with door-to-alert timing
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerAITriage = void 0;
exports.runAIPipeline = runAIPipeline;
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
const audit_1 = require("../utils/audit");
const alertService_1 = require("./alertService");
const index_1 = require("../index");
const validators_1 = require("../utils/validators");
const TRIAGE_URL = process.env.TRIAGE_URL || process.env.AI_SERVICE_URL || 'http://sewa-triage:8000';
const UNCERTAINTY_URL = process.env.UNCERTAINTY_URL || process.env.AI_UNCERTAINTY_URL || 'http://sewa-uncertainty:8002';
const VLM_URL = process.env.VLM_URL || process.env.AI_VLM_URL || 'http://sewa-vlm-report:8001';
const METACOGNITION_URL = process.env.METACOGNITION_URL || process.env.AI_METACOGNITION_URL || 'http://sewa-metacognition:8003';
const TIMEOUT = { timeout: 30_000 };
const VLM_TIMEOUT = { timeout: 45_000 };
/**
 * Executes a POST request with automatic GPU-to-CPU fallback logic.
 */
async function postWithFallback(url, data, config) {
    try {
        const resp = await axios_1.default.post(url, { ...data, use_cpu: false }, config);
        return resp.data;
    }
    catch (err) {
        // If GPU service is busy (503), timeout (408/ECONNABORTED), or unreachable (ECONNREFUSED)
        const isRetryable = err.response?.status === 503 || err.code === 'ECONNABORTED' || err.code === 'ECONNREFUSED';
        if (isRetryable) {
            logger_1.logger.warn(`[AI Engine] GPU Service at ${url} unavailable. Triggering CPU fallback...`);
            try {
                // Retry with CPU flag — Backend services (FastAPI/Torch) should handle device('cpu')
                const cpuResp = await axios_1.default.post(url, { ...data, use_cpu: true }, { ...config, timeout: config.timeout * 2 });
                return cpuResp.data;
            }
            catch (cpuErr) {
                logger_1.logger.error(`[AI Engine] CPU Fallback also failed for ${url}: ${cpuErr.message}`);
                throw cpuErr;
            }
        }
        throw err;
    }
}
/**
 * Emergency Fallback Engine
 * Used when both GPU and CPU remote services are offline.
 * Provides a safety-first, heuristic-based result to prevent clinical pipeline stalls.
 */
function getEmergencyFallbackResult(scanId) {
    return {
        primaryFinding: 'Service Unavailable (Emergency Fallback)',
        primaryCondition: 'UNKNOWN',
        confidence: 0.5,
        urgency: 'ROUTINE',
        allFindings: [],
        inferenceMs: 0,
    };
}
// ── Main orchestration entry point ────────────────────────────────────────
async function runAIPipeline(scanId, tenantId) {
    const pipelineStart = Date.now();
    logger_1.logger.info(`[AI Pipeline] Starting scan ${scanId}`);
    try {
        const scan = await database_1.prisma.scan.findUniqueOrThrow({
            where: { id: scanId },
            include: { patient: { include: { user: true } }, tenant: true },
        });
        await database_1.prisma.scan.update({ where: { id: scanId }, data: { status: 'processing' } });
        // ── Engine 1: Triage ──────────────────────────────────────────────────
        let triage;
        try {
            triage = await postWithFallback(`${TRIAGE_URL}/predict`, { scan_id: scanId, storage_url: scan.storageUrl, modality: scan.modality, body_part: scan.bodyPart }, TIMEOUT);
        }
        catch (e) {
            triage = getEmergencyFallbackResult(scan);
            logger_1.logger.warn(`[Triage] ${scanId}: Emergency fallback used due to service failure.`);
        }
        logger_1.logger.info(`[Triage] ${scanId}: ${triage.primaryFinding} (${(triage.confidence * 100).toFixed(1)}%) in ${triage.inferenceMs}ms`);
        // ── Engine 2: Uncertainty ─────────────────────────────────────────────
        let uncertainty;
        try {
            uncertainty = await postWithFallback(`${UNCERTAINTY_URL}/uncertainty/explain`, { scan_id: scanId, storage_url: scan.storageUrl, modality: scan.modality, body_part: scan.bodyPart, triage_confidence: triage.confidence }, TIMEOUT);
        }
        catch (e) {
            uncertainty = { epistemicUncertainty: 1.0, aleatoricUncertainty: 1.0, compositeScore: 1.0, highUncertaintyFlag: true, oodDistance: 10.0, inferenceMs: 0 };
        }
        logger_1.logger.info(`[Uncertainty] ${scanId}: composite=${uncertainty.compositeScore.toFixed(3)}, OOD=${uncertainty.oodDistance.toFixed(2)}`);
        // ── Engine 3: VLM Report Generator ───────────────────────────────────
        let vlm;
        try {
            vlm = await postWithFallback(`${VLM_URL}/generate`, {
                scan_id: scanId, primary_finding: triage.primaryFinding,
                condition: triage.primaryCondition, confidence: triage.confidence,
                urgency: triage.urgency, all_findings: triage.allFindings,
                shap_values: triage.shapValues,
                modality: scan.modality, body_part: scan.bodyPart,
                patient_age: scan.patient?.dateOfBirth ? getAge(scan.patient.dateOfBirth) : null,
                patient_sex: scan.patient?.sex || null,
                clinical_indication: scan.clinicalIndication,
                technique: scan.technique,
                language: scan.tenant?.reportLanguage || 'en',
            }, VLM_TIMEOUT);
        }
        catch (e) {
            vlm = { technique: scan.technique || 'Standard Protocol', findings: 'AI Service Temporarily Unavailable.', impression: 'Unable to generate automated impression.', recommendation: 'Urgent human radiologist review required.', language: 'en', inferenceMs: 0 };
        }
        logger_1.logger.info(`[VLM] ${scanId}: report generated in ${vlm.inferenceMs}ms`);
        // ── Engine 4: Metacognition ───────────────────────────────────────────
        let metacog;
        try {
            metacog = await postWithFallback(`${METACOGNITION_URL}/evaluate`, {
                scan_id: scanId, primary_finding: triage.primaryFinding,
                primary_condition: triage.primaryCondition,
                confidence: triage.confidence, urgency: triage.urgency,
                all_findings: triage.allFindings,
                uncertainty_score: uncertainty.compositeScore,
                epistemic_uncertainty: uncertainty.epistemicUncertainty,
                ood_distance: uncertainty.oodDistance,
                shap_values: triage.shapValues || {},
                modality: scan.modality, body_part: scan.bodyPart,
                patient_age: scan.patient?.dateOfBirth ? getAge(scan.patient.dateOfBirth) : null,
                impression: vlm.impression, findings: vlm.findings,
            }, TIMEOUT);
        }
        catch (e) {
            metacog = { layer1_modality_plausibility: 'FAIL', layer2_urgency_consistency: 'FLAG', layer3_confidence_floor: 'FAIL', layer4_shap_coherence: 'FLAG', layer5_uncertainty_conflict: 'FLAG', layer6_report_concordance: 'FLAG', layer7_demographic_plausibility: 'FLAG', layer8_hallucination_risk: 1.0, layer9_safe_to_alert: false, inferenceMs: 0 };
        }
        logger_1.logger.info(`[Metacognition] ${scanId}: safe_to_alert=${metacog.layer9_safe_to_alert}, H=${metacog.layer8_hallucination_risk.toFixed(3)}`);
        const doorToAlertMs = Date.now() - pipelineStart;
        // ── Result Validation & Persistence ──────────────────────────────────
        // Feature 3: Industrialized Safety Architecture
        const validatedResult = validators_1.AIResultSchema.parse({
            scanId,
            primaryFinding: triage.primaryFinding,
            urgency: triage.urgency === 'ROUTINE' ? 'NORMAL' : triage.urgency, // Logic normalization
            confidence: triage.confidence,
            uncertaintyScore: uncertainty.compositeScore,
            metacognitionFlags: [
                ...(metacog.layer9_safe_to_alert ? [] : ['UNSAFE_TO_ALERT']),
                ...(uncertainty.highUncertaintyFlag ? ['HIGH_UNCERTAINTY'] : []),
            ],
        });
        const aiResult = await database_1.prisma.aIResult.create({
            data: {
                ...validatedResult,
                epistemicUncertainty: uncertainty.epistemicUncertainty,
                aleatoricUncertainty: uncertainty.aleatoricUncertainty,
                rawJson: {
                    triage,
                    uncertainty,
                    vlm,
                    metacog,
                    doorToAlertMs,
                },
                modelId: 'sewa-ensemble-v2',
            },
        });
        // ── Create Draft Report ────────────────────────────────────────────────
        await database_1.prisma.report.create({
            data: {
                scanId,
                tenantId,
                authorId: 'SYSTEM', // AI Agent
                content: `TECHNIQUE: ${vlm.technique}\n\nFINDINGS: ${vlm.findings}\n\nIMPRESSION: ${vlm.impression}\n\nRECOMMENDATION: ${vlm.recommendation}`,
                summary: vlm.recommendation, // Use recommendation as summary for now
                status: 'draft',
                version: 1,
            },
        });
        // ── Update scan status ─────────────────────────────────────────────────
        await database_1.prisma.scan.update({
            where: { id: scanId },
            data: {
                status: 'ai_complete',
                urgency: triage.urgency,
                requiresHumanReview: !metacog.layer9_safe_to_alert || uncertainty.highUncertaintyFlag,
                humanReviewReason: uncertainty.highUncertaintyFlag ? 'HIGH_UNCERTAINTY' : (!metacog.layer9_safe_to_alert ? 'METACOGNITION_FAIL' : null)
            },
        });
        // ── Mandatory escalation for high uncertainty ──────────────────────────
        if (uncertainty.highUncertaintyFlag) {
            logger_1.logger.warn(`[Uncertainty] ${scanId}: HIGH UNCERTAINTY — routing to human review queue`);
            await database_1.prisma.scan.update({ where: { id: scanId }, data: { requiresHumanReview: true, humanReviewReason: 'HIGH_UNCERTAINTY' } });
        }
        // ── Audit log ─────────────────────────────────────────────────────────
        await (0, audit_1.auditLog)({
            tenantId,
            userId: 'SYSTEM',
            action: 'AI_RESULT_CREATED',
            entity: 'AIResult',
            entityId: aiResult.id,
            metadata: {
                scanId,
                urgency: triage.urgency,
                confidence: triage.confidence,
                safeToAlert: metacog.layer9_safe_to_alert,
                doorToAlertMs,
            },
        });
        // ── Real-time worklist update ──────────────────────────────────────────
        index_1.io.to(`tenant:${tenantId}`).emit('scan:ai_complete', {
            scanId, urgency: triage.urgency, confidence: triage.confidence,
            primaryFinding: triage.primaryFinding,
            metacognitionPassed: metacog.layer9_safe_to_alert,
            doorToAlertMs,
        });
        // ── Cache result for 1 hour ────────────────────────────────────────────
        await redis_1.redisClient.setex(`ai:result:${scanId}`, 3600, JSON.stringify(aiResult));
        // ── Alert dispatch ─────────────────────────────────────────────────────
        if (metacog.layer9_safe_to_alert) {
            await alertService_1.alertService.dispatch({
                tenantId, scanId, aiResultId: aiResult.id,
                urgency: triage.urgency, primaryFinding: triage.primaryFinding,
                confidence: triage.confidence,
                doorToAlertMs,
            });
        }
        else {
            logger_1.logger.warn(`[Metacognition] ${scanId}: FAIL — routed to human review`);
            index_1.io.to(`tenant:${tenantId}`).emit('scan:review_required', {
                scanId, urgency: triage.urgency, confidence: triage.confidence,
                reason: 'metacognition_safety_gate',
            });
        }
        logger_1.logger.info(`[AI Pipeline] ${scanId} complete in ${doorToAlertMs}ms`);
    }
    catch (err) {
        logger_1.logger.error(`[AI Pipeline] ${scanId} FAILED: ${err.message}`);
        await database_1.prisma.scan.update({
            where: { id: scanId },
            data: { status: 'failed', errorMessage: err.message },
        }).catch(() => { });
        throw err;
    }
}
// ── Utility ───────────────────────────────────────────────────────────────
function getAge(dob) {
    return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
}
// Export legacy alias for backward compat
const triggerAITriage = (scanId, tenantId) => runAIPipeline(scanId, tenantId);
exports.triggerAITriage = triggerAITriage;
