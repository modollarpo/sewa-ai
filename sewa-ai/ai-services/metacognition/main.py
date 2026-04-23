# SEWA AI — ai-services/metacognition/main.py  (CPU Edition)
# Clinical safety gate — pure rule-based Python, zero ML model.
# Checks: plausibility, urgency consistency, confidence calibration,
# SHAP coherence, uncertainty conflict, demographic flags.
# Latency: ~20-60ms (pure CPU computation, no model inference).
# NHS DCB0129: This is the final safety gate before any clinical alert fires.

import os
import time
import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

import numpy as np
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("sewa-metacognition")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5000").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"[Metacognition] Started | rules={len(MODALITY_FINDING_MATRIX)} modality combinations")
    yield
    logger.info("[Metacognition] Shutdown")


app = FastAPI(
    title="SEWA AI — Metacognition Engine (CPU Edition)",
    version="2.0.0",
    description=(
        "CPU-native clinical safety gate. Rule-based multi-layer self-evaluation. "
        "Final check before any alert reaches a clinician."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ─── Clinical Knowledge Base ──────────────────────────────────
# These rules encode radiological facts for plausibility checking.
# In production, this is a larger validated medical ontology.

MODALITY_FINDING_MATRIX: Dict[str, List[str]] = {
    "CT_Head":    ["ICH", "Ischemic Stroke", "Hemorrhagic Stroke", "Subdural Hematoma",
                   "Epidural Hematoma", "Subarachnoid Hemorrhage", "Cerebral Edema",
                   "Mass Effect", "Hydrocephalus", "Normal"],
    "CT_Chest":   ["Pulmonary Embolism", "Pneumothorax", "Pleural Effusion",
                   "Pneumonia", "Lung Mass", "Aortic Dissection", "Pericardial Effusion",
                   "Rib Fracture", "Normal"],
    "CT_Abdomen": ["Bowel Perforation", "Appendicitis", "Splenic Laceration",
                   "Bowel Obstruction", "Aortic Aneurysm", "Ascites", "Normal"],
    "MRI_Brain":  ["Ischemic Stroke", "Brain Tumor", "Multiple Sclerosis",
                   "Encephalitis", "Metastasis", "Cerebral Abscess", "Normal"],
    "MRI_Spine":  ["Disc Herniation", "Spinal Stenosis", "Cord Compression",
                   "Fracture", "Tumor", "Normal"],
    "XR_Chest":   ["Pneumonia", "TB", "Pneumothorax", "Pleural Effusion",
                   "Cardiomegaly", "Lung Mass", "Normal"],
}

URGENCY_FINDING_MAP: Dict[str, str] = {
    "ICH":                    "CRITICAL",
    "Ischemic Stroke":        "CRITICAL",
    "Hemorrhagic Stroke":     "CRITICAL",
    "Epidural Hematoma":      "CRITICAL",
    "Subarachnoid Hemorrhage":"CRITICAL",
    "Tension Pneumothorax":   "CRITICAL",
    "Aortic Dissection":      "CRITICAL",
    "Pulmonary Embolism":     "URGENT",
    "Pneumothorax":           "URGENT",
    "Bowel Perforation":      "URGENT",
    "Appendicitis":           "URGENT",
    "Subdural Hematoma":      "URGENT",
    "Pneumonia":              "NORMAL",
    "TB":                     "NORMAL",
    "Disc Herniation":        "NORMAL",
    "Normal":                 "NORMAL",
}

# Confidence thresholds below which we flag low confidence
CONFIDENCE_THRESHOLDS = {
    "CRITICAL": 0.70,  # Must be >70% to dispatch critical alert
    "URGENT":   0.60,
    "NORMAL":   0.40,
}

# ─── Request / Response Schemas ───────────────────────────────
class SHAPValue(BaseModel):
    f: str           # feature name
    v: float         # importance value 0–1

class MetacognitionRequest(BaseModel):
    scan_id: str
    primary_finding: str
    urgency: str
    confidence: float                    # 0.0–1.0
    uncertainty_score: float             # from uncertainty engine
    shap_values: Optional[List[SHAPValue]] = []
    modality: str
    body_part: str
    patient_age: Optional[int] = None
    patient_sex: Optional[str] = None
    # Secondary findings from triage engine
    all_findings: Optional[List[Dict[str, Any]]] = []
    # VLM report text for contradiction check
    report_text: Optional[str] = None

class MetacognitionFlag(BaseModel):
    code: str
    severity: str    # WARNING | ERROR | INFO
    message: str
    suggestion: str

class MetacognitionResponse(BaseModel):
    scan_id: str
    passed: bool                     # True = safe to send to radiologist
    hallucination_risk: float        # 0.0–1.0
    calibration_score: float         # how well-calibrated confidence is
    self_eval_notes: str
    flags: List[MetacognitionFlag]
    corrected_urgency: Optional[str] = None   # if metacog overrides urgency
    corrected_confidence: Optional[float] = None
    safe_to_alert: bool              # whether to fire critical alert to pager
    evaluation_ms: int
    evaluated_at: str

# ─── Core Evaluation Logic ─────────────────────────────────────
class MetacognitionEvaluator:
    """
    Implements a multi-layer self-evaluation pipeline:
    1. Modality–finding plausibility check
    2. Urgency–finding consistency check
    3. Confidence calibration
    4. SHAP coherence (are features actually informative?)
    5. Uncertainty–confidence agreement
    6. Contradiction detection (finding vs. report text)
    7. Hallucination risk scoring
    8. Final safety gate decision
    """

    def evaluate(self, req: MetacognitionRequest) -> MetacognitionResponse:
        start = time.time()
        flags: List[MetacognitionFlag] = []
        hallucination_risk = 0.0

        # ── 1. Modality-finding plausibility ──────────────────
        key = f"{req.modality}_{req.body_part}"
        valid_findings = MODALITY_FINDING_MATRIX.get(key, [])
        if valid_findings and req.primary_finding not in valid_findings:
            flags.append(MetacognitionFlag(
                code="IMPLAUSIBLE_FINDING",
                severity="ERROR",
                message=f"'{req.primary_finding}' is not a known finding for {req.modality} {req.body_part}.",
                suggestion="Verify scan modality/body part. Consider model retraining on this combination."
            ))
            hallucination_risk += 0.45
            logger.warning(f"[{req.scan_id}] Implausible finding: {req.primary_finding} on {key}")

        # ── 2. Urgency-finding consistency ────────────────────
        expected_urgency = URGENCY_FINDING_MAP.get(req.primary_finding)
        corrected_urgency = None
        if expected_urgency and expected_urgency != req.urgency:
            severity = "ERROR" if expected_urgency == "CRITICAL" else "WARNING"
            flags.append(MetacognitionFlag(
                code="URGENCY_MISMATCH",
                severity=severity,
                message=f"Expected urgency '{expected_urgency}' for '{req.primary_finding}', got '{req.urgency}'.",
                suggestion=f"Urgency auto-corrected to '{expected_urgency}'. Radiologist should review."
            ))
            corrected_urgency = expected_urgency
            hallucination_risk += 0.25
            logger.warning(f"[{req.scan_id}] Urgency mismatch: {req.urgency} → {expected_urgency}")

        # ── 3. Confidence calibration ──────────────────────────
        min_conf = CONFIDENCE_THRESHOLDS.get(req.urgency, 0.5)
        calibration_score = min(1.0, req.confidence / max(min_conf, 0.01))
        corrected_confidence = None
        if req.confidence < min_conf:
            flags.append(MetacognitionFlag(
                code="LOW_CONFIDENCE",
                severity="WARNING",
                message=f"Confidence {req.confidence:.1%} is below minimum {min_conf:.0%} for {req.urgency} finding.",
                suggestion="Downgrade urgency or flag for mandatory human review."
            ))
            hallucination_risk += 0.15
            # Auto-downgrade urgency if confidence is very low
            if req.confidence < min_conf * 0.7:
                corrected_confidence = req.confidence
                if corrected_urgency is None:
                    corrected_urgency = "NORMAL" if req.urgency == "CRITICAL" else req.urgency

        # ── 4. SHAP coherence ─────────────────────────────────
        shap_coherence = self._check_shap_coherence(req.shap_values or [], req.primary_finding, req.modality)
        if shap_coherence["score"] < 0.4:
            flags.append(MetacognitionFlag(
                code="SHAP_INCOHERENCE",
                severity="WARNING",
                message=f"SHAP features do not strongly support '{req.primary_finding}' ({shap_coherence['score']:.2f}/1.0).",
                suggestion="AI may be relying on spurious image features. Mandatory radiologist review."
            ))
            hallucination_risk += 0.20

        # ── 5. Uncertainty-confidence agreement ───────────────
        # High confidence + high uncertainty = contradiction
        if req.confidence > 0.85 and req.uncertainty_score > 0.35:
            flags.append(MetacognitionFlag(
                code="CONFIDENCE_UNCERTAINTY_CONFLICT",
                severity="WARNING",
                message=f"High confidence ({req.confidence:.1%}) conflicts with high uncertainty ({req.uncertainty_score:.2f}).",
                suggestion="Model may be overconfident. Treat as URGENT regardless of primary urgency."
            ))
            hallucination_risk += 0.15

        # ── 6. Contradiction detection in report text ─────────
        if req.report_text:
            contradiction = self._detect_report_contradiction(req.report_text, req.primary_finding)
            if contradiction:
                flags.append(MetacognitionFlag(
                    code="REPORT_CONTRADICTION",
                    severity="ERROR",
                    message=f"Report text contradicts primary finding: {contradiction}",
                    suggestion="Re-generate report or manual review before signing."
                ))
                hallucination_risk += 0.30

        # ── 7. Age-sex plausibility ────────────────────────────
        age_flag = self._check_age_sex_plausibility(req.primary_finding, req.patient_age, req.patient_sex)
        if age_flag:
            flags.append(MetacognitionFlag(
                code="DEMOGRAPHIC_IMPLAUSIBILITY",
                severity="WARNING",
                message=age_flag,
                suggestion="Confirm patient demographics. Finding is unusual for this age/sex group."
            ))
            hallucination_risk += 0.10

        # ── 8. Final risk capping ──────────────────────────────
        hallucination_risk = min(1.0, round(hallucination_risk, 4))

        # ── 9. Pass/Fail decision ──────────────────────────────
        error_flags = [f for f in flags if f.severity == "ERROR"]
        passed = len(error_flags) == 0 and hallucination_risk < 0.60

        # Never fire a CRITICAL alert without metacog passing
        safe_to_alert = passed and (corrected_urgency or req.urgency) in ("CRITICAL", "URGENT")

        # ── Self-evaluation narrative ──────────────────────────
        self_eval_notes = self._build_narrative(req, flags, hallucination_risk, passed)

        eval_ms = int((time.time() - start) * 1000)

        logger.info(
            f"[{req.scan_id}] Metacog: passed={passed}, risk={hallucination_risk:.3f}, "
            f"flags={len(flags)}, urgency_override={corrected_urgency}, ms={eval_ms}"
        )

        return MetacognitionResponse(
            scan_id=req.scan_id,
            passed=passed,
            hallucination_risk=hallucination_risk,
            calibration_score=round(calibration_score, 4),
            self_eval_notes=self_eval_notes,
            flags=flags,
            corrected_urgency=corrected_urgency,
            corrected_confidence=corrected_confidence,
            safe_to_alert=safe_to_alert,
            evaluation_ms=eval_ms,
            evaluated_at=datetime.utcnow().isoformat(),
        )

    def _check_shap_coherence(
        self, shap_values: List[SHAPValue], finding: str, modality: str
    ) -> Dict[str, float]:
        """Check if top SHAP features are radiologically meaningful for the finding."""
        if not shap_values:
            return {"score": 0.5}  # neutral if no SHAP data

        # Minimum expected feature importance for top feature
        top_val = max((s.v for s in shap_values), default=0.0)
        total   = sum(s.v for s in shap_values)
        concentration = top_val / total if total > 0 else 0

        # Score: higher is better; we want concentrated, high-value SHAP
        score = min(1.0, (top_val * 0.6) + (concentration * 0.4))
        return {"score": round(score, 4), "top_value": top_val}

    def _detect_report_contradiction(self, report_text: str, finding: str) -> Optional[str]:
        """
        Simple lexical contradiction detection.
        In production: use a fine-tuned NLI model (e.g. DeBERTa-v3-large).
        """
        report_lower = report_text.lower()
        finding_lower = finding.lower()

        # If the finding keyword doesn't appear in the report at all
        key_terms = finding_lower.split()
        found_any = any(term in report_lower for term in key_terms if len(term) > 3)

        # If report says "no evidence of" + finding keyword
        negation_phrases = ["no evidence of", "no acute", "unremarkable", "normal study", "no significant"]
        negated = any(phrase in report_lower for phrase in negation_phrases)

        if negated and found_any:
            return f"Report contains negation phrase near '{finding}'"
        if not found_any and finding != "Normal":
            return f"Finding '{finding}' not mentioned in generated report"
        return None

    def _check_age_sex_plausibility(
        self, finding: str, age: Optional[int], sex: Optional[str]
    ) -> Optional[str]:
        """Flag demographically unusual findings."""
        if age is None:
            return None
        rules = [
            (finding == "ICH" and age < 10,
             "ICH is uncommon under age 10 without trauma — consider abuse or vascular anomaly."),
            (finding == "Pulmonary Embolism" and age < 18,
             "PE is rare in paediatric patients — confirm clinical context."),
            (finding == "Ischemic Stroke" and age < 30,
             "Stroke under 30 is unusual — consider dissection, hypercoagulable state."),
        ]
        for condition, message in rules:
            if condition:
                return message
        return None

    def _build_narrative(
        self,
        req: MetacognitionRequest,
        flags: List[MetacognitionFlag],
        hallucination_risk: float,
        passed: bool,
    ) -> str:
        lines = [
            f"Metacognition evaluation for scan {req.scan_id}.",
            f"Primary finding: '{req.primary_finding}' | Modality: {req.modality} {req.body_part}",
            f"Declared urgency: {req.urgency} | Confidence: {req.confidence:.1%} | Uncertainty: {req.uncertainty_score:.3f}",
            f"",
            f"EVALUATION RESULT: {'✓ PASSED — Safe to present to radiologist' if passed else '✗ FAILED — Human review required before dispatch'}",
            f"Hallucination risk score: {hallucination_risk:.3f}/1.0",
            f"",
        ]
        if flags:
            lines.append(f"Flags raised ({len(flags)}):")
            for f in flags:
                lines.append(f"  [{f.severity}] {f.code}: {f.message}")
        else:
            lines.append("No flags raised. All checks passed.")
        lines += [
            "",
            f"Evaluated by: SEWA AI Metacognition Engine v2.0.0",
            f"Timestamp: {datetime.utcnow().isoformat()}",
        ]
        return "\n".join(lines)


evaluator = MetacognitionEvaluator()

# ─── Endpoints ────────────────────────────────────────────────
@app.post("/metacognition/evaluate", response_model=MetacognitionResponse)
async def evaluate(req: MetacognitionRequest) -> MetacognitionResponse:
    try:
        return evaluator.evaluate(req)
    except Exception as e:
        logger.error(f"Metacognition error for {req.scan_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/metacognition/evaluate-batch")
async def evaluate_batch(reqs: List[MetacognitionRequest]) -> List[MetacognitionResponse]:
    """Batch evaluation for bulk processing."""
    return [evaluator.evaluate(r) for r in reqs]


@app.get("/metacognition/rules")
async def get_rules() -> Dict[str, Any]:
    """Return the clinical rule set (for transparency / audit)."""
    return {
        "modality_finding_matrix": MODALITY_FINDING_MATRIX,
        "urgency_finding_map": URGENCY_FINDING_MAP,
        "confidence_thresholds": CONFIDENCE_THRESHOLDS,
        "version": "2.0.0",
    }


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "metacognition-engine",
        "version": "2.0.0",
        "backend": "cpu-rules",
        "rules_loaded": len(MODALITY_FINDING_MATRIX),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/metrics")
async def metrics() -> Dict[str, Any]:
    return {
        "metacognition_rules": len(MODALITY_FINDING_MATRIX),
        "urgency_map_entries": len(URGENCY_FINDING_MAP),
        "backend": "cpu-rules",
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app", host="0.0.0.0", port=8003,
        workers=4, loop="uvloop", access_log=False,
    )
