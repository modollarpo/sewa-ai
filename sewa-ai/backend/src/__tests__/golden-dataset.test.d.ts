interface GoldenAIResult {
    scanId: string;
    modality: 'CT' | 'MRI' | 'XR' | 'US';
    bodyPart: string;
    findings: string[];
    primaryDiagnosis: string;
    confidence: number;
    urgency: 'CRITICAL' | 'URGENT' | 'ROUTINE' | 'NORMAL';
    uncertaintyScore: number;
    epistemicUncertainty: number;
    aleatoricUncertainty: number;
    metacognitionPassed: boolean;
    gradcamUrl: string;
    reportStructure: {
        findings: boolean;
        impression: boolean;
        recommendation: boolean;
    };
    doorToAlertMs?: number;
    region: string;
}
declare const GOLDEN_RESULTS: GoldenAIResult[];
/** Generate 80 additional ground truth cases systematically */
declare function generateBatch(): GoldenAIResult[];
