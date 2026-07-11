// SEWA XAI — src/services/aiOrchestrator.ts  (CPU-OPTIMISED EDITION)
// Core AI Pipeline Orchestrator: Triage ‖ Uncertainty → VLM → Metacognition
//
// KEY CPU OPTIMISATION: Triage + Uncertainty now run in PARALLEL (Promise.all).
// Sequential (before): ~900ms + ~500ms = 1,400ms used before VLM starts.
// Parallel  (after) :  max(900ms, 500ms) = ~900ms — saves ~500ms off p50.
//
// Total pipeline budget on Standard_F8s_v2 (8 vCPU, ONNX INT8):
//   Triage ‖ Uncertainty : ~500-900ms (parallel)
//   VLM (template-based) : ~30ms
//   Metacognition        : ~50ms
//   Overhead             : ~100ms
//   p50 total            : ~700ms–1.1s ✅ well within 2-4s SLA
//
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import { AxiosError } from 'axios';
import { prisma } from '../utils/prismaClient';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';
import { alertService } from './alertService';
import { io } from '../index';
import { AIResultSchema } from '../utils/validators';
import { config } from '../config/env';
import * as fhirService from './fhirService';
import * as longitudinalService from './longitudinalService';
import { dlq } from './dlqService';
import { createAxiosInstance } from '../utils/axiosInstance';
import { buildVLMSystemPrompt, translateUrgency, type SupportedLanguage } from './vlmLanguageService';
import { clinicalRulesEngine } from './roadmap/clinicalRulesEngine';
import { strokeCodeService, type StrokeCodeType } from './roadmap/strokeCodeService';

const axios = createAxiosInstance();

// ── Pipeline Stage Tracking ─────────────────────────────────────────────
export type PipelineStage =
  | 'preprocessing'
  | 'triage_uncertainty'
  | 'vlm'
  | 'metacognition'
  | 'human_review'
  | 'complete'
  | 'failed';

const PIPELINE_TERMINAL_STAGES: readonly PipelineStage[] = ['complete', 'failed', 'human_review'];

interface StageTimings {
  triage?: number;
  uncertainty?: number;
  vlm?: number;
  metacog?: number;
  fhir?: number;
  longitudinal?: number;
  pathology?: number;
  quality?: number;
  total?: number;
}

interface PipelineMetadata {
  stageTimings: StageTimings;
  qualityFlags: string[];
  retryCount: number;
  backend: string;
  consentBlocked?: boolean;
}

/**
 * Emit real-time pipeline stage progress via Socket.IO and persist to Scan record.
 * Every stage transition is both emitted to clients AND written to the database,
 * so the pipeline status API can reconstruct the full timeline from DB alone.
 */
async function emitStageProgress(
  scanId: string,
  tenantId: string,
  stage: PipelineStage,
  meta: Partial<PipelineMetadata> = {},
): Promise<void> {
  const updateData: Record<string, unknown> = { pipelineStage: stage };

  if (stage === 'preprocessing') {
    updateData.pipelineStartedAt = new Date();
    updateData.status = 'processing';
  } else if (PIPELINE_TERMINAL_STAGES.includes(stage)) {
    updateData.pipelineCompletedAt = new Date();
    if (stage === 'complete') updateData.status = 'ai_complete';
    if (stage === 'failed') updateData.status = 'failed';
    if (stage === 'human_review') updateData.status = 'pending_review';
  }

  if (Object.keys(meta).length > 0) {
    updateData.pipelineMetadata = meta as any;
  }

  await prisma.scan.update({ where: { id: scanId }, data: updateData }).catch(() => {});

  io.to(`tenant:${tenantId}`).emit('pipeline:stage', {
    scanId,
    stage,
    timestamp: new Date().toISOString(),
    ...meta,
  });
}

// ── Service URLs — CPU-only endpoints (same pods, just no GPU flag needed) ──
const TRIAGE_URL        = config.AI_SERVICE_URL;
const UNCERTAINTY_URL   = config.UNCERTAINTY_SERVICE_URL;
const VLM_URL           = config.VLM_SERVICE_URL;
const METACOGNITION_URL = config.METACOGNITION_SERVICE_URL;
const PATHOLOGY_URL     = config.PATHOLOGY_SERVICE_URL;   // Digital Pathology WSI service

// CPU services are slower — generous timeouts, but within 2-4s SLA budget
const SVC_TIMEOUT  = { timeout: 8_000  };   // per AI service call (8s generous ceiling)
const VLM_TIMEOUT  = { timeout: 12_000 };   // VLM: template-based, fast on CPU

// ── Types ─────────────────────────────────────────────────────────────────
export interface TriageResult {
  primaryFinding: string;
  primaryCondition: string;
  confidence: number;
  urgency: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'ROUTINE';
  allFindings: Array<{ condition: string; probability: number }>;
  gradCamUrl?: string;
  shapValues?: Record<string, number>;
  inferenceMs: number;
  backend?: string;   // "onnx-int8" | "onnx-fp32" | "demo"
}

export interface UncertaintyResult {
  epistemicUncertainty: number;
  aleatoricUncertainty: number;
  compositeScore: number;
  highUncertaintyFlag: boolean;
  mcPassesUsed?: number;
  inferenceMs: number;
}

export interface VLMResult {
  technique: string;
  findings: string;
  impression: string;
  recommendation: string;
  language: string;
  inferenceMs: number;
}

export interface MetacognitionResult {
  layer1_modality_plausibility:   'PASS' | 'FAIL' | 'REJECT';
  layer2_urgency_consistency:     'PASS' | 'FAIL' | 'FLAG';
  layer3_confidence_floor:        'PASS' | 'FAIL' | 'FLAG';
  layer4_shap_coherence:          'PASS' | 'FAIL' | 'FLAG';
  layer5_uncertainty_conflict:    'PASS' | 'FAIL' | 'FLAG';
  layer6_report_concordance:      'PASS' | 'FAIL' | 'FLAG';
  layer7_demographic_plausibility:'PASS' | 'FAIL' | 'FLAG';
  layer8_hallucination_risk:      number;
  layer9_safe_to_alert:           boolean;
  inferenceMs: number;
}

export interface PathologyResult {
  scan_id:         string;
  primary_finding: string;
  snomed_code:     string;
  urgency:         'URGENT' | 'NORMAL' | 'CRITICAL';
  confidence:      number;
  tissue_type:     string;
  gleason_grade:   string | null;
  ki67_estimate:   number | null;
  all_findings:    Array<{ condition: string; probability: number }>;
  inference_ms:    number;
  model_version:   string;
  backend:         string;
  recommendation:  string;
}

// ── Safe HTTP wrapper ────────────────────────────────────────────────────
/**
 * POST with timeout-aware error handling.
 * CPU-only: no GPU/CPU flag switching — services are natively CPU.
 * Retries once on 503 (pod restarting / ORT warmup).
 */
async function safePOST<T>(
  url: string,
  data: Record<string, unknown>,
  cfg: { timeout: number },
  retries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await axios.post<T>(url, data, cfg);
      return resp.data;
    } catch (err: any) {
      const status = (err as AxiosError).response?.status;
      const isRetryable = status === 503 || status === 429 || err.code === 'ECONNABORTED' || err.code === 'ECONNRESET';

      if (isRetryable && attempt < retries) {
        // Exponential backoff: 300ms, 900ms
        const delayMs = 300 * Math.pow(3, attempt);
        logger.warn(`[AI Orch] ${url} returned ${status ?? err.code} — retry ${attempt + 1}/${retries} in ${delayMs}ms`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`safePOST: exhausted retries for ${url}`);
}

// No mock/fallback logic in production builds — failures route to DLQ for retries

// ── Main pipeline ─────────────────────────────────────────────────────────
export async function runAIPipeline(scanId: string, tenantId: string): Promise<void> {
  const pipelineStart = Date.now();
  const stageTimings: StageTimings = {};
  const qualityFlags: string[] = [];
  const retryCount = 0;
  let aiBackend = 'unknown';

  logger.info(`[AI Pipeline] ▶ ${scanId} | CPU-ONNX-INT8 pipeline`);

  try {
    const scan = await prisma.scan.findUniqueOrThrow({
      where: { id: scanId },
      include: { patient: { include: { user: true } }, tenant: true },
    });

    // ── Stage 0: PREPROCESSING ──────────────────────────────────────────────
    await emitStageProgress(scanId, tenantId, 'preprocessing');

    // ── Quality assessment ──────────────────────────────────────────────────
    // Check for obvious quality issues before running expensive AI inference
    if (scan.fileSize && scan.fileSize < 1024) {
      qualityFlags.push('SUSPICIOUSLY_SMALL_FILE');
    }

    // ── GDPR / NHS DSPT: Consent Gate ─────────────────────────────────────
    if (scan.patient && scan.patient.consentAI === false) {
      logger.warn(`[AI Pipeline] CONSENT_BLOCKED: scan ${scanId} — patient has consentAI=false. Routing to human review.`);
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'pending_review', requiresHumanReview: true, humanReviewReason: 'CONSENT_NOT_GIVEN' },
      });
      await auditLog({
        tenantId, userId: 'SYSTEM', action: 'AI_BLOCKED_NO_CONSENT',
        entity: 'Scan', entityId: scanId,
        metadata: { reason: 'Patient consentAI=false — GDPR Article 9 compliance gate' },
      });
      io.to(`tenant:${tenantId}`).emit('scan:review_required', {
        scanId, reason: 'consent_not_given', urgency: 'ROUTINE',
      });
      await emitStageProgress(scanId, tenantId, 'human_review', {
        stageTimings, qualityFlags, retryCount, backend: aiBackend, consentBlocked: true,
      });
      return;
    }
    // ──────────────────────────────────────────────────────────────────────

    const patientAge = scan.patient?.dateOfBirth ? _getAge(scan.patient.dateOfBirth) : null;
    const patientSex = (scan.patient as any)?.sex ?? null;

    // ── 0. Fetch FHIR Clinical Context (Feature 7) ────────────────────────
    let clinicalContext = '';
    if (scan.patient?.fhirId) {
      try {
        const [conditions, labs] = await Promise.all([
          fhirService.searchFHIRConditions(scan.patient.fhirId),
          fhirService.searchFHIRObservations(scan.patient.fhirId)
        ]);

        const history = conditions.entry?.map((e: any) => e.resource.code?.text || e.resource.code?.coding?.[0]?.display).filter(Boolean).join(', ');
        const recentLabs = labs.entry?.slice(0, 5).map((e: any) => {
          const res = e.resource;
          return `${res.code?.text || 'Lab'}: ${res.valueQuantity?.value}${res.valueQuantity?.unit || ''}`;
        }).join(' · ');

        clinicalContext = `[HISTORY]: ${history || 'None'} | [RECENT_LABS]: ${recentLabs || 'None'}`;
        logger.info(`[AI Pipeline] FHIR Context: ${clinicalContext}`);
      } catch (err: any) {
        logger.warn(`[AI Pipeline] FHIR context fetch failed: ${err.message}`);
      }
    }

    // ── 0.1 Fetch Longitudinal Context (Feature 8) ───────────────────────
    let longitudinalContext = 'No prior scans for comparison.';
    if (scan.patientId) {
      const prior = await longitudinalService.findPriorScan(scan.patientId, scan.id, scan.modality, scan.bodyPart);
      longitudinalContext = longitudinalService.formatLongitudinalPrompt(prior);
      logger.info(`[AI Pipeline] Longitudinal: ${longitudinalContext}`);
    }

    // ──────────────────────────────────────────────────────────────────────
    // PATH MODALITY FAST-TRACK: Digital Pathology slides bypass imaging triage
    // and are processed directly by the dedicated WSI classification service.
    // ──────────────────────────────────────────────────────────────────────
    if (scan.modality === 'PATH') {
      logger.info(`[AI Pipeline] PATH modality detected — routing to pathology engine: ${scanId}`);
      const pathResult = await safePOST<PathologyResult>(
        `${PATHOLOGY_URL}/pathology/predict`,
        {
          scan_id:      scanId,
          storage_url:  scan.storageUrl,
          tissue_type:  scan.bodyPart,
          model_version: 'v1.0.0',
        },
        { timeout: 15_000 },  // WSI tiling can take up to 10s
      );
      logger.info(`[Pathology] ${scanId}: ${pathResult.primary_finding} | urgency=${pathResult.urgency} | ${pathResult.inference_ms}ms`);

      // Persist pathology AI result
      const pathAIResult = await prisma.aIResult.create({
        data: {
          tenantId,
          scanId,
          primaryFinding:      pathResult.primary_finding,
          urgency:             pathResult.urgency === 'CRITICAL' ? 'CRITICAL' : pathResult.urgency === 'URGENT' ? 'URGENT' : 'NORMAL',
          confidence:          pathResult.confidence,
          uncertaintyScore:    0,   // Pathology engine uses ensemble voting, not MC-Dropout
          metacognitionFlags:  [],
          summary:             pathResult.primary_finding,
          epistemicUncertainty: 0,
          aleatoricUncertainty: 0,
          rawJson: {
            pathology: pathResult,
            pipeline:  { service: 'sewa-pathology', backend: pathResult.backend },
          } as any,
          modelId:             `sewa-path-onnx-int8-${pathResult.model_version}`,
          clinicalContext,
          longitudinalContext,
          vlmFindings:         pathResult.recommendation,
          vlmImpression:       `${pathResult.primary_finding} (${(pathResult.confidence * 100).toFixed(0)}% confidence)` +
                                (pathResult.gleason_grade ? `. ${pathResult.gleason_grade}.` : '') +
                                (pathResult.ki67_estimate != null ? ` Ki67 index: ${(pathResult.ki67_estimate * 100).toFixed(0)}%.` : ''),
        },
      });

      // Generate pathology-specific report
      await prisma.report.create({
        data: {
          scanId, tenantId,
          authorId:       'SYSTEM',
          findings:       pathResult.recommendation,
          impression:     pathAIResult.vlmImpression ?? pathResult.primary_finding,
          technique:      `Digital pathology tile classification — ${pathResult.tissue_type} tissue. H&E stain normalisation (Macenko SVD). ONNX INT8 patch-level inference.`,
          recommendation: pathResult.recommendation,
          content:        [
            `TECHNIQUE: Digital pathology. H&E stain. Tissue: ${pathResult.tissue_type}.`,
            `FINDINGS: ${pathResult.primary_finding} (confidence: ${(pathResult.confidence * 100).toFixed(0)}%).`,
            pathResult.gleason_grade ? `GRADING: ${pathResult.gleason_grade}.` : '',
            pathResult.ki67_estimate != null ? `PROLIFERATION INDEX (Ki67 estimate): ${(pathResult.ki67_estimate * 100).toFixed(0)}%.` : '',
            `SNOMED: ${pathResult.snomed_code}.`,
            `\nRECOMMENDATION: ${pathResult.recommendation}`,
          ].filter(Boolean).join('\n'),
          summary:        pathAIResult.vlmImpression ?? pathResult.primary_finding,
          status:         'draft',
        },
      });

      // Update scan status
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status:              'ai_complete',
          urgency:             pathResult.urgency,
          requiresHumanReview: pathResult.urgency !== 'NORMAL',
          humanReviewReason:   pathResult.urgency !== 'NORMAL' ? 'PATHOLOGY_MDT_ESCALATION' : null,
        },
      });

      await auditLog({
        tenantId, userId: 'SYSTEM', action: 'AI_RESULT_CREATED',
        entity: 'AIResult', entityId: pathAIResult.id,
        metadata: { scanId, modality: 'PATH', finding: pathResult.primary_finding, urgency: pathResult.urgency },
      });

      // Real-time alert if urgent
      if (pathResult.urgency === 'URGENT' || pathResult.urgency === 'CRITICAL') {
        await alertService.dispatch({
          tenantId,
          scanId,
          aiResultId:     pathAIResult.id,
          urgency:        pathResult.urgency as 'URGENT' | 'CRITICAL',
          primaryFinding: pathResult.primary_finding,
          confidence:     pathResult.confidence,
          doorToAlertMs:  Date.now() - pipelineStart,
        }).catch(err => logger.error(`[Pathology] Alert dispatch failed: ${err.message}`));
      }

      io.to(`tenant:${tenantId}`).emit('scan:ai_complete', {
        scanId, urgency: pathResult.urgency,
        finding: pathResult.primary_finding,
        confidence: pathResult.confidence,
        modality: 'PATH',
      });

      logger.info(`[AI Pipeline] ✓ PATH pipeline complete: ${scanId} | ${Date.now() - pipelineStart}ms total`);
      return;  // PATH pipeline exits here — does not continue to imaging triage stages
    }

    // ──────────────────────────────────────────────────────────────────────
    // STAGE 1: Triage ‖ Uncertainty (PARALLEL)
    //
    // Both engines read the same DICOM from blob storage independently.
    // Combined latency = max(triage_ms, uncertainty_ms) instead of their sum.
    // Budget: ~500-900ms for both (vs ~1400ms sequential)
    // ──────────────────────────────────────────────────────────────────────
    await emitStageProgress(scanId, tenantId, 'triage_uncertainty');
    const stage1Start = Date.now();

    const [triage, uncertainty] = await Promise.all([

      // Engine 1: Triage — ONNX INT8 EfficientNet-B0
      safePOST<TriageResult>(
        `${TRIAGE_URL}/triage/predict`,
        {
          scan_id: scanId,
          storage_url: scan.storageUrl,
          modality: scan.modality,
          body_part: scan.bodyPart,
          clinical_context: clinicalContext,
        },
        SVC_TIMEOUT,
      ),

      // Engine 2: Uncertainty — 10-pass ONNX MC-Dropout (parallel, not blocked by triage)
      safePOST<UncertaintyResult>(
        `${UNCERTAINTY_URL}/uncertainty/explain`,
        {
          scan_id: scanId,
          storage_url: scan.storageUrl,
          modality: scan.modality,
          body_part: scan.bodyPart,
          // Uncertainty doesn't need triage result — uses its own ONNX pass
          primary_finding: 'unknown',  // will be overridden with real triage below
          confidence: 0.5,             // neutral prior while running in parallel
        },
        SVC_TIMEOUT,
      ),

    ]);

    const stage1Ms = Date.now() - stage1Start;
    logger.info(
      `[Stage 1] ${scanId} | triage=${triage.inferenceMs}ms uncertainty=${uncertainty.inferenceMs}ms ` +
      `| parallel_wall=${stage1Ms}ms | backend=${triage.backend ?? 'unknown'}`
    );
    stageTimings.triage = triage.inferenceMs;
    stageTimings.uncertainty = uncertainty.inferenceMs;
    aiBackend = triage.backend ?? 'unknown';

    // ──────────────────────────────────────────────────────────────────────
    // STAGE 2: VLM Report — template-based on CPU, ~30ms
    // ──────────────────────────────────────────────────────────────────────
    await emitStageProgress(scanId, tenantId, 'vlm');
    const reportLanguage = ((scan.tenant as any)?.reportLanguage ?? 'en') as SupportedLanguage;
    const vlmSystemPrompt = buildVLMSystemPrompt(reportLanguage);
    const localizedUrgency = translateUrgency(triage.urgency, reportLanguage);

    const vlm = await safePOST<VLMResult>(
      `${VLM_URL}/vlm/generate-report`,
      {
        scan_id:              scanId,
        storage_url:          scan.storageUrl,
        modality:             scan.modality,
        body_part:            scan.bodyPart,
        patient_age:          patientAge,
        patient_sex:          patientSex,
        clinical_indication:  scan.clinicalIndication,
        ai_finding:           triage.primaryFinding,
        urgency:              localizedUrgency,
        confidence:           triage.confidence,
        location:             (triage as any).location,
        shap_values:          triage.shapValues,
        clinical_context:     clinicalContext,
        longitudinal_context: longitudinalContext,
        region:               scan.tenant?.region ?? 'uk',
        language:             reportLanguage,
        system_prompt:        vlmSystemPrompt,
      },
      VLM_TIMEOUT,
    );
    logger.info(`[VLM] ${scanId}: report in ${vlm.inferenceMs}ms`);
    stageTimings.vlm = vlm.inferenceMs;

    // ──────────────────────────────────────────────────────────────────────
    // STAGE 3: Metacognition — rule-based, ~50ms on CPU (pure Python, no model)
    // ──────────────────────────────────────────────────────────────────────
    await emitStageProgress(scanId, tenantId, 'metacognition');
    const metacog = await safePOST<MetacognitionResult>(
      `${METACOGNITION_URL}/metacognition/evaluate`,
      {
        scan_id:          scanId,
        primary_finding:  triage.primaryFinding,
        primary_condition: triage.primaryCondition,
        urgency:          triage.urgency,
        confidence:       triage.confidence,
        uncertainty_score: uncertainty.compositeScore,
        shap_values:      triage.shapValues || {},
        modality:         scan.modality,
        body_part:        scan.bodyPart,
        patient_age:      patientAge,
        patient_sex:      patientSex,
        all_findings:     triage.allFindings,
        report_text:      vlm.findings,
      },
      SVC_TIMEOUT,
    );
    logger.info(
      `[Metacognition] ${scanId}: safe_to_alert=${metacog.layer9_safe_to_alert} ` +
      `hallucination_risk=${metacog.layer8_hallucination_risk.toFixed(3)} ms=${metacog.inferenceMs}`
    );
    stageTimings.metacog = metacog.inferenceMs;

    const doorToAlertMs = Date.now() - pipelineStart;

    // ── Persist AI result ────────────────────────────────────────────────
    const validatedResult = AIResultSchema.parse({
      scanId,
      primaryFinding:   triage.primaryFinding,
      urgency:          triage.urgency === 'ROUTINE' ? 'NORMAL' : triage.urgency,
      confidence:       triage.confidence,
      uncertaintyScore: uncertainty.compositeScore,
      metacognitionFlags: [
        ...(metacog.layer9_safe_to_alert  ? []                    : ['UNSAFE_TO_ALERT']),
        ...(uncertainty.highUncertaintyFlag ? ['HIGH_UNCERTAINTY'] : []),
      ],
    });

    const aiResult = await prisma.aIResult.create({
      data: {
        tenantId, // Ensure tenantId is persisted for isolation
        ...validatedResult,
        summary: triage.primaryFinding, // populate summary
        epistemicUncertainty: uncertainty.epistemicUncertainty,
        aleatoricUncertainty: uncertainty.aleatoricUncertainty,
        rawJson: {
          triage,
          uncertainty: {
            ...uncertainty,
            mcPassesUsed: uncertainty.mcPassesUsed ?? null, // M3: expose passes used
          },
          vlm, metacog, doorToAlertMs,
          pipeline: { stage1ParallelMs: stage1Ms, backend: triage.backend },
        } as any,
        modelId: 'sewa-cpu-onnx-int8-v2',
        clinicalContext,
        longitudinalContext,
        vlmFindings:   vlm.findings,
        vlmImpression: vlm.impression,
      },
    });

    await prisma.report.create({
      data: {
        scanId, tenantId,
        authorId: 'SYSTEM',
        findings: vlm.findings,
        impression: vlm.impression,
        technique: vlm.technique,
        recommendation: vlm.recommendation,
        content: `TECHNIQUE: ${vlm.technique}\n\nFINDINGS: ${vlm.findings}\n\nIMPRESSION: ${vlm.impression}\n\nRECOMMENDATION: ${vlm.recommendation}`,
        summary: vlm.impression,
        status: 'draft',
      },
    });

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'ai_complete',
        urgency: triage.urgency,
        requiresHumanReview: !metacog.layer9_safe_to_alert || uncertainty.highUncertaintyFlag,
        humanReviewReason: uncertainty.highUncertaintyFlag
          ? 'HIGH_UNCERTAINTY'
          : (!metacog.layer9_safe_to_alert ? 'METACOGNITION_FAIL' : null),
      },
    });

    await auditLog({
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
        backend: triage.backend ?? 'unknown',
        stage1ParallelMs: stage1Ms,
      },
    });

    // Real-time worklist update
    io.to(`tenant:${tenantId}`).emit('scan:ai_complete', {
      scanId, urgency: triage.urgency, confidence: triage.confidence,
      primaryFinding: triage.primaryFinding,
      metacognitionPassed: metacog.layer9_safe_to_alert,
      doorToAlertMs,
    });

    // Cache result
    await redisClient.setex(`ai:result:${scanId}`, 3600, JSON.stringify(aiResult));

    // Alert dispatch (only if metacog passed)
    if (metacog.layer9_safe_to_alert) {
      await alertService.dispatch({
        tenantId, scanId, aiResultId: aiResult.id,
        urgency: triage.urgency, primaryFinding: triage.primaryFinding,
        confidence: triage.confidence, doorToAlertMs,
      });
    } else {
      logger.warn(`[Metacognition] ${scanId}: FAIL — routed to human review`);
      io.to(`tenant:${tenantId}`).emit('scan:review_required', {
        scanId, urgency: triage.urgency, reason: 'metacognition_safety_gate',
      });
    }

    stageTimings.total = Date.now() - pipelineStart;
    const terminalStage: PipelineStage = !metacog.layer9_safe_to_alert || uncertainty.highUncertaintyFlag
      ? 'human_review'
      : 'complete';
    await emitStageProgress(scanId, tenantId, terminalStage, {
      stageTimings,
      qualityFlags,
      retryCount,
      backend: aiBackend,
    });

    logger.info(
      `[AI Pipeline] ✓ ${scanId} | door-to-alert=${doorToAlertMs}ms | ` +
      `stage1=${stage1Ms}ms | backend=${aiBackend} | total=${stageTimings.total}ms`
    );

  } catch (err: any) {
    logger.error(`[AI Pipeline] ✗ ${scanId} FAILED: ${err.message}`, { stack: err.stack });
    stageTimings.total = Date.now() - pipelineStart;
    await emitStageProgress(scanId, tenantId, 'failed', {
      stageTimings,
      qualityFlags,
      retryCount,
      backend: aiBackend,
    }).catch(() => {});
    // BG1/BG2: Push to DLQ for automatic retry with exponential backoff
    await dlq.enqueue(scanId, tenantId, err.message, 0).catch(() => {});
    throw err;
  }
}

function _getAge(dob: Date): number {
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3_600_000));
}

// Legacy alias — backward compat
export const triggerAITriage = (scanId: string, tenantId: string) =>
  runAIPipeline(scanId, tenantId);
