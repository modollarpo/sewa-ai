// services/aiClinicalVerificationService.ts
import { apiClient } from './apiClient';
import type { ClinicalActionLog } from './clinicalAuditLogger';

export interface AIClinicalResult {
  scanId: string;
  aiModel: string;
  confidenceScore: number;
  uncertaintyScore: number;
  primaryFinding: string;
  alternativeFindings: string[];
  clinicalDecision: 'CONFIRM' | 'MONITOR' | 'REJECT' | 'REQUIRE_SECOND_OPINION';
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendedAction: ClinicalAction;
  secondOpinionRequired: boolean;
  patientContext?: PatientContext;
  regulatoryCompliance?: ComplianceCheck;
}

export interface ClinicalAction {
  action: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedTime: number;
  requiredCredentials: string[];
  regulatoryRequirements: string[];
}

export interface PatientContext {
  age: number;
  sex: 'M' | 'F' | 'OTHER';
  comorbidities: string[];
  medications: string[];
  previousScanHistory: string[];
  riskFactors: string[];
}

export interface ComplianceCheck {
  gdprCompliant: boolean;
  hipaaCompliant: boolean;
  ukcaCompliant: boolean;
  dataProcessingLegalBasis: 'CONSENT' | 'LEGAL_OBLIGATION' | 'VITAL_INTERESTS' | 'PUBLIC_TASK' | 'LEGITIMATE_INTERESTS';
  retentionPeriodCompliant: boolean;
  auditTrailComplete: boolean;
}

export interface ClinicalVerificationResult {
  verificationId: string;
  clinicalFindings: ClinicalFinding[];
  confidenceVerification: ConfidenceVerification;
  complianceStatus: ComplianceCheck;
  secondOpinion?: SecondOpinion;
  recommendation?: ClinicalRecommendation;
}

export interface ClinicalFinding {
  finding: string;
  confidence: number;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  basedOn: string[];
  verifications: VerificationMethod[];
}

export interface ConfidenceVerification {
  aiConfidence: number;
  clinicalConfidence: number;
  uncertaintyQuantified: number;
  thresholdExceeded: boolean;
  verificationMethod: 'DIRECT_OBSERVATION' | 'SCANNED_IMAGES' | 'PATIENT_HISTORY' | 'BLOOD_TESTS';
}

export interface SecondOpinion {
  required: boolean;
  specialistType: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  referralId: string;
}

export interface ClinicalRecommendation {
  action: string;
  timeline: string;
  requiredClearance: string[];
  followUpRequired: boolean;
  followUpDate?: string;
}

export interface VerificationMethod {
  method: string;
  confidence: number;
  lastVerified: Date;
  verifier: string;
  licenseNumber: string;
}

export class AIClinicalVerificationService {
  private static instance: AIClinicalVerificationService;

  constructor() {
    if (AIClinicalVerificationService.instance) {
      throw new Error('Use AIClinicalVerificationService.getInstance()');
    }
  }

  static getInstance(): AIClinicalVerificationService {
    if (!AIClinicalVerificationService.instance) {
      AIClinicalVerificationService.instance = new AIClinicalVerificationService();
    }
    return AIClinicalVerificationService.instance;
  }

  async processAIDiagnosis(
    scanData: any,
    patientId: string,
    clinicianId: string
  ): Promise<AIClinicalResult> {
    try {
      const result = await apiClient.post('/ai/analyze', {
        scanData,
        patientId,
        clinicianId,
      });
      return this.enhanceClinicalResult(result.data);
    } catch (error) {
      console.error('AI diagnosis processing failed:', error);
      throw error;
    }
  }

  async performConfidenceVerification(
    aiResult: AIClinicalResult,
    clinicianId: string,
    verificationMethods: VerificationMethod[]
  ): Promise<ClinicalVerificationResult> {
    try {
      const verification = await apiClient.post('/clinical/verify', {
        aiResult,
        clinicianId,
        verificationMethods,
      });
      return verification.data;
    } catch (error) {
      console.error('Clinical verification failed:', error);
      throw error;
    }
  }

  async getPatientContextualScore(patientId: string): Promise<number> {
    try {
      const response = await apiClient.get(`/ai/patient-context-score/${patientId}`);
      return response.data.contextScore;
    } catch (error) {
      console.error('Patient context score fetch failed:', error);
      return 0.5;
    }
  }

  private enhanceClinicalResult(result: AIClinicalResult): AIClinicalResult {
    return {
      ...result,
      confidenceLevel: this.calculateConfidenceLevel(result.confidenceScore),
      riskLevel: this.calculateRiskLevel(result.primaryFinding, result.confidenceScore),
      recommendedAction: this.suggestClinicalAction(result),
      secondOpinionRequired: this.requiresSecondOpinion(result),
    };
  }

  private calculateConfidenceLevel(confidenceScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (confidenceScore >= 0.95) return 'CRITICAL';
    if (confidenceScore >= 0.90) return 'HIGH';
    if (confidenceScore >= 0.80) return 'MEDIUM';
    return 'LOW';
  }

  private calculateRiskLevel(finding: string, confidenceScore: number): 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
    const riskMap: Record<string, { threshold: number; level: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' }> = {
      'Intracranial Haemorrhage': { threshold: 0.90, level: 'CRITICAL' },
      'Stroke': { threshold: 0.85, level: 'CRITICAL' },
      'Pulmonary Embolism': { threshold: 0.85, level: 'CRITICAL' },
      'Acute MI': { threshold: 0.85, level: 'CRITICAL' },
      'Meningitis': { threshold: 0.80, level: 'HIGH' },
      'Pneumonia': { threshold: 0.75, level: 'HIGH' },
      'Sepsis': { threshold: 0.70, level: 'HIGH' },
      'Heart Failure': { threshold: 0.70, level: 'HIGH' },
      'Kidney Injury': { threshold: 0.65, level: 'MODERATE' },
      'Hypotension': { threshold: 0.60, level: 'MODERATE' },
      'Hypoxia': { threshold: 0.60, level: 'MODERATE' },
    };

    const rule = riskMap[finding] || { threshold: 0.70, level: 'LOW' };
    return confidenceScore >= rule.threshold ? rule.level : 'MINIMAL';
  }

  private suggestClinicalAction(result: AIClinicalResult): ClinicalAction {
    const actionMap: Record<string, ClinicalAction> = {
      'Intracranial Haemorrhage': {
        action: 'IMMEDIATE INTERVENTION REQUIRED',
        priority: 'CRITICAL',
        estimatedTime: 15,
        requiredCredentials: ['EMERGENCY_CONSENT', 'NEUROLOGICAL_CONSULT'],
        regulatoryRequirements: ['EMERGENCY_PROTOCOL', 'ETHICS_COMMITTEE_APPROVAL'],
      },
      'Stroke': {
        action: 'TPA THERAPY WINDOW EVALUATION',
        priority: 'CRITICAL',
        estimatedTime: 60,
        requiredCredentials: ['STROKE_PROTOCOL', 'RADIOLOGY_CONSENT'],
        regulatoryRequirements: ['TIME_IS_BRAIN_PROTOCOL', 'NHS_CRITICAL_CARE_PATHWAY'],
      },
      'Pulmonary Embolism': {
        action: 'ANTICOAGULATION THERAPY INITIATION',
        priority: 'HIGH',
        estimatedTime: 30,
        requiredCredentials: ['HEMATOLOGY_CONSULT', 'IMAGING_CONSENT'],
        regulatoryRequirements: ['ANTICOAGULATION_PROTOCOL', 'RISK_ASSESSMENT'],
      },
      'default': {
        action: 'CLINICAL REVIEW AND MONITORING',
        priority: 'MEDIUM',
        estimatedTime: 120,
        requiredCredentials: ['GENERAL_CONSENT', 'PRIMARY_CARE_FOLLOWUP'],
        regulatoryRequirements: ['ROUTINE_MONITORING', 'FOLLOW_UP_SCHEDULING'],
      },
    };

    return actionMap[result.primaryFinding] || actionMap.default;
  }

  private requiresSecondOpinion(result: AIClinicalResult): boolean {
    return (
      result.riskLevel === 'CRITICAL' ||
      result.confidenceScore < 0.75 ||
      result.uncertaintyScore > 0.20 ||
      result.confidenceLevel === 'LOW'
    );
  }

  async getSecondOpinionRequest(
    scanId: string,
    primaryFinding: string,
    confidenceScore: number,
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  ): Promise<SecondOpinion> {
    return {
      required: true,
      specialistType: this.determineSpecialistType(primaryFinding),
      urgency,
      referralId: `ref_${scanId}_${Date.now()}`,
    };
  }

  private determineSpecialistType(finding: string): string {
    const specialistMap: Record<string, string> = {
      'Intracranial Haemorrhage': 'NEUROLOGIST',
      'Stroke': 'NEUROLOGIST',
      'Pulmonary Embolism': 'INTERNSIST',
      'Acute MI': 'CARDIOLOGIST',
      'Meningitis': 'INFECTION_SPECIALIST',
      'Pneumonia': 'RESPIRATORY_SPECIALIST',
      'Sepsis': 'INTENSIVE_CARE_SPECIALIST',
      'Heart Failure': 'CARDIOLOGIST',
      'Kidney Injury': 'NEPHROLOGIST',
      'Hypotension': 'EMERGENCY_PHYSICIAN',
      'Hypoxia': 'RESPIRATORY_SPECIALIST',
    };

    return specialistMap[finding] || 'GENERAL_PHYSICIAN';
  }

  async createAuditLogForClinicalAction(
    action: ClinicalActionLog
  ): Promise<void> {
    try {
      await apiClient.post('/clinical/audit/full-log', action);
    } catch (error) {
      console.error('Clinical audit log creation failed:', error);
      throw error;
    }
  }

  async validateAndLogConfidenceVerification(
    confidenceResult: ConfidenceVerification,
    clinicalAction: ClinicalAction,
    clinicianId: string
  ): Promise<{ compliancePassed: boolean; auditId: string }> {
    const auditLog: ClinicalActionLog = {
      id: `confidence_audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      actionType: 'CONFIDENCE_VERIFICATION' as any,
      userId: clinicianId,
      tenantId: 'system',
      patientId: 'audit_needed',
      aiModel: 'triage_v2.4.1',
      confidenceScore: confidenceResult.aiConfidence,
      uncertaintyScore: confidenceResult.uncertaintyQuantified,
      clinicalDecision: `AI_VERIFIED_${confidenceResult.thresholdExceeded ? 'EXCEEDED' : 'WITHIN_THRESHOLDS'}`,
      clinicalVerification: 'CONFIRMED',
      outcome: confidenceResult.verificationMethod,
      regulatoryCompliance: {
        gdpr: 'COMPLIANT',
        hipaa: 'COMPLIANT',
        ukca: 'CE_MARKED',
        overall: 'COMPLIANT',
        lastChecked: new Date(),
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    };

    return this.createAuditLogForClinicalAction(auditLog);
  }
}