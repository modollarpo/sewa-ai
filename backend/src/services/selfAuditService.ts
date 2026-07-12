// SEWA XAI — selfAuditService.ts
// Self-Audit / Metacognition Pipeline: clinical rule validation, VLM↔uncertainty
// contradiction detection, confidence calibration, explainability report generation,
// and decision routing (AUTO_COMPLETE | FLAG_FOR_REVIEW | FORCE_HUMAN_REVIEW | QUARANTINE).
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';

// ── Types ─────────────────────────────────────────────────────────────────

interface TriageResult {
  primaryFinding: string;
  urgency: string;
  confidence: number;
  findings: Array<{ name: string; confidence: number; location?: string }>;
}

interface UncertaintyResult {
  epistemic: number;
  aleatoric: number;
  composite: number;
}

interface VLMResult {
  impression: string;
  findings: string[];
  confidence: number;
}

interface MetacognitionResult {
  layers: Array<{ id: string; passed: boolean; detail?: string }>;
  hallucinationRisk: number;
  safeToAlert: boolean;
}

interface SelfAuditResult {
  decision: 'AUTO_COMPLETE' | 'FLAG_FOR_REVIEW' | 'FORCE_HUMAN_REVIEW' | 'QUARANTINE';
  confidence: number;
  reasoning: string;
  contradictions: ContradictionResult;
  clinicalRules: ClinicalRuleResult;
  explainabilityReport: ExplainabilityReportData;
}

interface ContradictionResult {
  detected: boolean;
  type?: 'VLM_TRIAGE_DISAGREE' | 'VLM_UNCERTAINTY_MISMATCH' | 'NONE';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  vlmSemanticSimilarity?: number;
}

interface ClinicalRuleResult {
  passed: number;
  failed: number;
  violations: Array<{ rule: string; detail: string }>;
}

interface ExplainabilityReportData {
  reasoningSteps: Array<{
    step: number;
    layer: string;
    description: string;
    passed: boolean;
    evidence: string;
  }>;
  summaryText: string;
  shapNarrative?: string;
}

interface SelfAuditInput {
  scanId: string;
  tenantId: string;
  triage: TriageResult;
  uncertainty: UncertaintyResult;
  vlm: VLMResult;
  metacognition: MetacognitionResult;
  patientAge?: number | null;
  patientSex?: string | null;
  modality: string;
  bodyPart?: string | null;
  shapValues?: Record<string, number>;
}

// ── Clinical Rule Definitions ─────────────────────────────────────────────

interface ClinicalRule {
  id: string;
  name: string;
  description: string;
  evaluate: (input: SelfAuditInput) => { passed: boolean; detail: string };
}

const CLINICAL_RULES: ClinicalRule[] = [
  {
    id: 'ANATOMIC_PLAUSIBILITY',
    name: 'Anatomic Plausibility',
    description: 'Checks whether the detected finding is anatomically plausible for the imaged body part',
    evaluate: (input) => {
      const finding = input.triage.primaryFinding.toLowerCase();
      const bodyPart = (input.bodyPart ?? '').toLowerCase();
      const modality = input.modality.toUpperCase();

      const anatomicalMap: Record<string, string[]> = {
        head: ['brain', 'intracranial', 'skull', 'sellar', 'pituitary', 'optic', 'cerebral'],
        brain: ['brain', 'intracranial', 'skull', 'sellar', 'pituitary', 'optic', 'cerebral'],
        chest: ['lung', 'pulmonary', 'cardiac', 'mediastinal', 'pleural', 'thoracic', 'rib', 'sternum', 'airway', 'lobe'],
        abdomen: ['liver', 'spleen', 'kidney', 'pancreas', 'bowel', 'intestinal', 'renal', 'hepatic', 'gallbladder', 'adrenal'],
        pelvis: ['bladder', 'prostate', 'uterine', 'ovarian', 'pelvic', 'rectal'],
        spine: ['vertebral', 'disc', 'spinal', 'cord', 'foraminal', 'paravertebral'],
        extremity: ['fracture', 'bone', 'joint', 'tendon', 'ligament', 'muscle'],
        knee: ['meniscal', 'cruciate', 'patellar', 'tibial', 'femoral', 'knee'],
        shoulder: ['rotator', 'labral', 'acromial', 'glenoid', 'supraspinatus'],
        neck: ['thyroid', 'cervical', 'carotid', 'lymph'],
      };

      if (!bodyPart) {
        return { passed: true, detail: 'No body part specified — anatomic plausibility check skipped' };
      }

      const keywords = anatomicalMap[bodyPart] ?? [];
      if (keywords.length === 0) {
        return { passed: true, detail: `No anatomic rules defined for body part '${bodyPart}' — check skipped` };
      }

      const matchFound = keywords.some((kw) => finding.includes(kw));
      if (matchFound) {
        return { passed: true, detail: `Finding '${finding}' is plausible for body part '${bodyPart}'` };
      }

      return {
        passed: false,
        detail: `Finding '${finding}' may not be anatomically plausible for body part '${bodyPart}' — expected one of: ${keywords.slice(0, 5).join(', ')}`,
      };
    },
  },
  {
    id: 'AGE_SEX_CONSISTENCY',
    name: 'Age/Sex Consistency',
    description: 'Validates that findings are consistent with patient age and sex demographics',
    evaluate: (input) => {
      const finding = input.triage.primaryFinding.toLowerCase();
      const age = input.patientAge;
      const sex = input.patientSex?.toLowerCase();

      if (age == null && !sex) {
        return { passed: true, detail: 'No patient demographics available — age/sex check skipped' };
      }

      const violations: string[] = [];

      // Pediatric-specific conditions that shouldn't appear in adults
      const pediatricFindings = ['natal teeth', 'neonatal', 'congenital', 'tetralogy of fallot', 'omphalocele'];
      const adultFindings = ['osteoporotic', 'calcified atheroma', 'bph', 'adenomyosis'];

      if (age != null) {
        if (age > 18 && pediatricFindings.some((pf) => finding.includes(pf))) {
          violations.push(`Finding '${finding}' is typically pediatric but patient age is ${age}`);
        }
        if (age < 10 && adultFindings.some((af) => finding.includes(af))) {
          violations.push(`Finding '${finding}' is typically adult but patient age is ${age}`);
        }
        if (age < 40 && finding.includes('osteoporotic')) {
          violations.push('Osteoporotic finding in patient under 40 — atypical');
        }
      }

      if (sex) {
        const maleOnly = ['prostatic', 'testicular', 'bph'];
        const femaleOnly = ['uterine', 'ovarian', 'adenomyosis', 'endometrial', 'cervical (female)'];

        if (sex === 'female' && maleOnly.some((mf) => finding.includes(mf))) {
          violations.push(`Male-specific finding '${finding}' in female patient`);
        }
        if (sex === 'male' && femaleOnly.some((ff) => finding.includes(ff))) {
          violations.push(`Female-specific finding '${finding}' in male patient`);
        }
      }

      if (violations.length > 0) {
        return { passed: false, detail: violations.join('; ') };
      }

      return { passed: true, detail: 'Finding is consistent with patient age/sex demographics' };
    },
  },
  {
    id: 'URGENCY_FINDING_MATCH',
    name: 'Urgency–Finding Consistency',
    description: 'Ensures urgency level matches the clinical severity of the detected finding',
    evaluate: (input) => {
      const finding = input.triage.primaryFinding.toLowerCase();
      const urgency = input.triage.urgency.toUpperCase();
      const confidence = input.triage.confidence;

      const criticalFindings = [
        'tension pneumothorax', 'aortic dissection', 'massive pe', 'large pe',
        'intracranial hemorrhage', 'ich', 'stroke', 'lvo', 'occlusion',
        'ruptured', 'tamponade', 'hemoperitoneum', 'active bleeding',
        'cauda equina', 'spinal cord compression',
      ];

      const urgentFindings = [
        'pulmonary embolism', 'pe', 'fracture', 'dislocation', 'obstruction',
        'perforation', 'abscess', 'cellulitis', 'pneumonia', 'effusion',
        'stenosis', 'stenotic',
      ];

      const isCriticalFinding = criticalFindings.some((cf) => finding.includes(cf));
      const isUrgentFinding = urgentFindings.some((uf) => finding.includes(uf));

      if (isCriticalFinding && urgency !== 'CRITICAL') {
        return {
          passed: false,
          detail: `Critical finding '${finding}' reported with urgency '${urgency}' — should be CRITICAL`,
        };
      }

      if (isUrgentFinding && urgency === 'ROUTINE') {
        return {
          passed: false,
          detail: `Urgent finding '${finding}' reported as ROUTINE — consider upgrading urgency`,
        };
      }

      if (confidence < 0.5 && urgency === 'CRITICAL') {
        return {
          passed: false,
          detail: `Low confidence (${(confidence * 100).toFixed(0)}%) for CRITICAL urgency — consider downgrading`,
        };
      }

      return { passed: true, detail: `Urgency '${urgency}' is consistent with finding '${finding}'` };
    },
  },
  {
    id: 'MODALITY_APPROPRIATENESS',
    name: 'Modality Appropriateness',
    description: 'Validates that findings are appropriate for the imaging modality used',
    evaluate: (input) => {
      const finding = input.triage.primaryFinding.toLowerCase();
      const modality = input.modality.toUpperCase();

      const modalityFindings: Record<string, string[]> = {
        CT: ['hemorrhage', 'fracture', 'mass', 'lesion', 'effusion', 'consolidation', 'emphysema', 'nodule', 'calcification', 'stenosis', 'obstruction'],
        MRI: ['demyelination', 'edema', 'enhancement', 'white matter', 'grey matter', 'disc herniation', 'ligament', 'tumor', 'infarct'],
        XRAY: ['fracture', 'consolidation', 'effusion', 'pneumothorax', 'cardiomegaly', 'nodule', 'opacity'],
        US: ['cyst', 'stone', 'gallstone', 'free fluid', 'thrombus', 'stenosis', 'calcification'],
        PATH: ['dysplasia', 'invasion', 'mitosis', 'necrosis', 'inflammation', 'atypia', 'neoplastic'],
        PET: ['uptake', 'metabolic', 'hypermetabolic', 'avid', 'fdg'],
        MG: ['microcalcification', 'architectural distortion', 'spiculated', 'mass', 'asymmetry'],
      };

      const expectedFindings = modalityFindings[modality];
      if (!expectedFindings) {
        return { passed: true, detail: `No modality-specific rules for '${modality}' — check skipped` };
      }

      const isAppropriate = expectedFindings.some((ef) => finding.includes(ef));
      if (isAppropriate) {
        return { passed: true, detail: `Finding '${finding}' is appropriate for modality '${modality}'` };
      }

      // Not a hard fail — some findings are modality-agnostic
      return {
        passed: true,
        detail: `Finding '${finding}' may not be typical for modality '${modality}' — flagged as advisory`,
      };
    },
  },
];

// ── Self-Audit Service ────────────────────────────────────────────────────

class SelfAuditService {

  async runSelfAudit(input: SelfAuditInput): Promise<SelfAuditResult> {
    const reasoningSteps: ExplainabilityReportData['reasoningSteps'] = [];
    let stepNumber = 1;

    // ── Layer A: Clinical Rule Validation ─────────────────────────────────
    const clinicalRules = this.evaluateClinicalRules(input);

    for (const rule of CLINICAL_RULES) {
      const result = rule.evaluate(input);
      reasoningSteps.push({
        step: stepNumber++,
        layer: 'A_CLINICAL_RULES',
        description: `${rule.name}: ${rule.description}`,
        passed: result.passed,
        evidence: result.detail,
      });
    }

    // ── Layer B: VLM ↔ Uncertainty Contradiction Detection ───────────────
    const contradictions = this.detectContradictions(input);

    reasoningSteps.push({
      step: stepNumber++,
      layer: 'B_CONTRADICTION',
      description: 'VLM–Triage semantic alignment and uncertainty consistency check',
      passed: !contradictions.detected,
      evidence: contradictions.detected
        ? `${contradictions.type} (${contradictions.severity}): similarity=${(contradictions.vlmSemanticSimilarity ?? 0).toFixed(3)}`
        : 'No contradictions detected',
    });

    // ── Layer C: Confidence Calibration Check ─────────────────────────────
    const calibrationPass = this.checkConfidenceCalibration(input);

    reasoningSteps.push({
      step: stepNumber++,
      layer: 'C_CALIBRATION',
      description: 'Confidence calibration: checks whether reported confidence aligns with uncertainty and metacognition',
      passed: calibrationPass.passed,
      evidence: calibrationPass.evidence,
    });

    // ── Layer D: Explainability Report Generation ─────────────────────────
    const shapNarrative = this.generateShapNarrative(input.shapValues, input.triage);

    reasoningSteps.push({
      step: stepNumber++,
      layer: 'D_EXPLAINABILITY',
      description: 'SHAP feature importance narrative and reasoning chain generation',
      passed: true,
      evidence: shapNarrative,
    });

    const summaryText = this.generateAuditSummary(reasoningSteps, input);

    // ── Layer E: Decision Routing ─────────────────────────────────────────
    const decision = this.routeDecision(input, contradictions, clinicalRules, calibrationPass);

    const selfAuditResult: SelfAuditResult = {
      decision,
      confidence: input.triage.confidence,
      reasoning: summaryText,
      contradictions,
      clinicalRules,
      explainabilityReport: {
        reasoningSteps,
        summaryText,
        shapNarrative,
      },
    };

    await this.persistAuditResult(input, selfAuditResult);

    logger.info(
      `[Self-Audit] ${input.scanId}: decision=${decision} ` +
      `confidence=${input.triage.confidence.toFixed(3)} ` +
      `contradictions=${contradictions.detected} clinical_violations=${clinicalRules.failed}`
    );

    return selfAuditResult;
  }

  // ── Clinical Rule Evaluation ───────────────────────────────────────────

  private evaluateClinicalRules(input: SelfAuditInput): ClinicalRuleResult {
    const violations: ClinicalRuleResult['violations'] = [];
    let passed = 0;
    let failed = 0;

    for (const rule of CLINICAL_RULES) {
      const result = rule.evaluate(input);
      if (result.passed) {
        passed++;
      } else {
        failed++;
        violations.push({ rule: rule.id, detail: result.detail });
      }
    }

    return { passed, failed, violations };
  }

  // ── Contradiction Detection (VLM ↔ Triage / Uncertainty) ──────────────

  private detectContradictions(input: SelfAuditInput): ContradictionResult {
    const vlmImpression = input.vlm.impression.toLowerCase();
    const triageFinding = input.triage.primaryFinding.toLowerCase();

    // Keyword overlap between VLM impression and triage finding
    const vlmKeywords = this.extractKeywords(vlmImpression);
    const triageKeywords = this.extractKeywords(triageFinding);

    const intersection = vlmKeywords.filter((kw) => triageKeywords.includes(kw));
    const union = new Set([...vlmKeywords, ...triageKeywords]);
    const semanticSimilarity = union.size > 0 ? intersection.length / union.size : 0;

    // VLM ↔ Triage disagreement
    if (semanticSimilarity < 0.1) {
      const severity = semanticSimilarity < 0.05 ? 'critical' : 'high';
      return {
        detected: true,
        type: 'VLM_TRIAGE_DISAGREE',
        severity,
        vlmSemanticSimilarity: semanticSimilarity,
      };
    }

    // VLM ↔ Uncertainty mismatch: high VLM confidence but high epistemic uncertainty
    if (input.vlm.confidence > 0.85 && input.uncertainty.epistemic > 0.5) {
      return {
        detected: true,
        type: 'VLM_UNCERTAINTY_MISMATCH',
        severity: input.uncertainty.epistemic > 0.7 ? 'high' : 'medium',
        vlmSemanticSimilarity: semanticSimilarity,
      };
    }

    // VLM ↔ Triage confidence disagreement
    const confidenceGap = Math.abs(input.vlm.confidence - input.triage.confidence);
    if (confidenceGap > 0.3) {
      return {
        detected: true,
        type: 'VLM_TRIAGE_DISAGREE',
        severity: confidenceGap > 0.5 ? 'high' : 'medium',
        vlmSemanticSimilarity: semanticSimilarity,
      };
    }

    // Low confidence from both VLM and triage
    if (input.vlm.confidence < 0.5 && input.triage.confidence < 0.5) {
      return {
        detected: true,
        type: 'VLM_UNCERTAINTY_MISMATCH',
        severity: 'medium',
        vlmSemanticSimilarity: semanticSimilarity,
      };
    }

    return {
      detected: false,
      type: 'NONE',
      severity: undefined,
      vlmSemanticSimilarity: semanticSimilarity,
    };
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
      'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'and', 'but', 'or', 'if', 'while', 'that', 'this', 'it', 'its',
      'there', 'which', 'who', 'whom', 'what', 'these', 'those',
    ]);

    return text
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
  }

  // ── Confidence Calibration Check ───────────────────────────────────────

  private checkConfidenceCalibration(input: SelfAuditInput): { passed: boolean; evidence: string } {
    const issues: string[] = [];

    // High triage confidence but high composite uncertainty
    if (input.triage.confidence > 0.9 && input.uncertainty.composite > 0.5) {
      issues.push(
        `High triage confidence (${(input.triage.confidence * 100).toFixed(0)}%) ` +
        `contradicts high composite uncertainty (${(input.uncertainty.composite * 100).toFixed(0)}%)`
      );
    }

    // Low triage confidence but metacognition passed
    if (input.triage.confidence < 0.6 && input.metacognition.safeToAlert) {
      issues.push(
        `Low triage confidence (${(input.triage.confidence * 100).toFixed(0)}%) ` +
        `but metacognition safe_to_alert is true`
      );
    }

    // High hallucination risk but metacognition passed
    if (input.metacognition.hallucinationRisk > 0.5 && input.metacognition.safeToAlert) {
      issues.push(
        `Hallucination risk ${(input.metacognition.hallucinationRisk * 100).toFixed(0)}% ` +
        `but metacognition safe_to_alert is true`
      );
    }

    // Metacognition layers failed but safe_to_alert is true
    const failedLayers = input.metacognition.layers.filter((l) => !l.passed);
    if (failedLayers.length > 0 && input.metacognition.safeToAlert) {
      issues.push(
        `${failedLayers.length} metacognition layer(s) failed ` +
        `[${failedLayers.map((l) => l.id).join(', ')}] but safe_to_alert is true`
      );
    }

    // Epistemic uncertainty dominance suggests model is extrapolating
    if (input.uncertainty.epistemic > input.uncertainty.aleatoric * 2 && input.uncertainty.epistemic > 0.4) {
      issues.push(
        `Epistemic uncertainty (${(input.uncertainty.epistemic * 100).toFixed(0)}%) ` +
        `dominates aleatoric (${(input.uncertainty.aleatoric * 100).toFixed(0)}%) — model may be extrapolating`
      );
    }

    return {
      passed: issues.length === 0,
      evidence: issues.length > 0 ? issues.join('; ') : 'All calibration checks passed',
    };
  }

  // ── SHAP Narrative Generation ──────────────────────────────────────────

  private generateShapNarrative(
    shapValues: Record<string, number> | undefined,
    triage: TriageResult
  ): string {
    if (!shapValues || Object.keys(shapValues).length === 0) {
      return `No SHAP values available for triage finding '${triage.primaryFinding}'. Feature attribution is not expllicable.`;
    }

    const sorted = Object.entries(shapValues)
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 5);

    const parts = sorted.map(([feature, value]) => {
      const direction = value > 0 ? 'supports' : 'opposes';
      return `${feature} ${direction} the finding (impact: ${Math.abs(value).toFixed(4)})`;
    });

    return `SHAP analysis for '${triage.primaryFinding}': ${parts.join('; ')}. ` +
      `These features collectively drive the model's prediction with ${sorted.length} top contributors identified.`;
  }

  // ── Audit Summary Generation ───────────────────────────────────────────

  private generateAuditSummary(
    steps: ExplainabilityReportData['reasoningSteps'],
    input: SelfAuditInput
  ): string {
    const passedSteps = steps.filter((s) => s.passed);
    const failedSteps = steps.filter((s) => !s.passed);

    const lines: string[] = [
      `Self-Audit Report for scan ${input.scanId}`,
      `Finding: ${input.triage.primaryFinding} | Urgency: ${input.triage.urgency} | Confidence: ${(input.triage.confidence * 100).toFixed(0)}%`,
      `Modality: ${input.modality} | Body Part: ${input.bodyPart ?? 'N/A'}`,
      '',
      `Layers evaluated: ${steps.length} | Passed: ${passedSteps.length} | Failed: ${failedSteps.length}`,
    ];

    if (failedSteps.length > 0) {
      lines.push('', 'Failed checks:');
      for (const step of failedSteps) {
        lines.push(`  [${step.layer}] ${step.description}: ${step.evidence}`);
      }
    }

    return lines.join('\n');
  }

  // ── Decision Routing ───────────────────────────────────────────────────

  private routeDecision(
    input: SelfAuditInput,
    contradictions: ContradictionResult,
    clinicalRules: ClinicalRuleResult,
    calibrationPass: { passed: boolean; evidence: string }
  ): SelfAuditResult['decision'] {

    // QUARANTINE: critical contradictions or multiple rule violations
    if (
      contradictions.severity === 'critical' ||
      clinicalRules.failed >= 3
    ) {
      return 'QUARANTINE';
    }

    // FORCE_HUMAN_REVIEW: high severity contradictions, or failed calibration + rule violations
    if (
      contradictions.severity === 'high' ||
      (clinicalRules.failed >= 2 && !calibrationPass.passed) ||
      (input.metacognition.hallucinationRisk > 0.7) ||
      (input.uncertainty.epistemic > 0.7 && input.triage.confidence > 0.8)
    ) {
      return 'FORCE_HUMAN_REVIEW';
    }

    // FLAG_FOR_REVIEW: medium contradictions, low confidence, or single rule violation
    if (
      contradictions.severity === 'medium' ||
      contradictions.type === 'VLM_TRIAGE_DISAGREE' ||
      input.triage.confidence < 0.6 ||
      clinicalRules.failed === 1 ||
      !calibrationPass.passed ||
      input.metacognition.hallucinationRisk > 0.4
    ) {
      return 'FLAG_FOR_REVIEW';
    }

    // AUTO_COMPLETE: everything passes with sufficient confidence
    return 'AUTO_COMPLETE';
  }

  // ── Persistence ────────────────────────────────────────────────────────

  private async persistAuditResult(
    input: SelfAuditInput,
    result: SelfAuditResult
  ): Promise<void> {
    try {
      // Store the self-audit result as structured data on the scan
      await prisma.scan.update({
        where: { id: input.scanId },
        data: {
          requiresHumanReview: result.decision !== 'AUTO_COMPLETE',
          humanReviewReason: result.decision !== 'AUTO_COMPLETE'
            ? `SELF_AUDIT_${result.decision}`
            : null,
        },
      });

      await auditLog({
        tenantId: input.tenantId,
        action: 'SELF_AUDIT_COMPLETED',
        entity: 'Scan',
        entityId: input.scanId,
        metadata: {
          decision: result.decision,
          confidence: result.confidence,
          contradictionsDetected: result.contradictions.detected,
          clinicalViolations: result.clinicalRules.failed,
          reasoningStepsCount: result.explainabilityReport.reasoningSteps.length,
        },
      });
    } catch (err: any) {
      logger.error(`[Self-Audit] Failed to persist audit result for ${input.scanId}: ${err.message}`);
    }
  }
}

export const selfAuditService = new SelfAuditService();
