export interface TriageResult {
    primaryFinding: string;
    primaryCondition: string;
    confidence: number;
    urgency: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'ROUTINE';
    allFindings: Array<{
        condition: string;
        probability: number;
        threshold: number;
    }>;
    gradCamUrl?: string;
    shapValues?: Record<string, number>;
    inferenceMs: number;
}
export interface UncertaintyResult {
    epistemicUncertainty: number;
    aleatoricUncertainty: number;
    compositeScore: number;
    highUncertaintyFlag: boolean;
    oodDistance: number;
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
    layer1_modality_plausibility: 'PASS' | 'FAIL' | 'REJECT';
    layer2_urgency_consistency: 'PASS' | 'FAIL' | 'FLAG';
    layer3_confidence_floor: 'PASS' | 'FAIL' | 'FLAG';
    layer4_shap_coherence: 'PASS' | 'FAIL' | 'FLAG';
    layer5_uncertainty_conflict: 'PASS' | 'FAIL' | 'FLAG';
    layer6_report_concordance: 'PASS' | 'FAIL' | 'FLAG';
    layer7_demographic_plausibility: 'PASS' | 'FAIL' | 'FLAG';
    layer8_hallucination_risk: number;
    layer9_safe_to_alert: boolean;
    inferenceMs: number;
}
export declare function runAIPipeline(scanId: string, tenantId: string): Promise<void>;
export declare const triggerAITriage: (scanId: string, tenantId: string) => Promise<void>;
