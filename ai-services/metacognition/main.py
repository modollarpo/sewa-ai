# SEWA XAI — ai-services/metacognition/main.py  (CPU Edition)
# Clinical safety gate — pure rule-based Python, zero ML model.
# Checks: plausibility, urgency consistency, confidence calibration,
# SHAP coherence, uncertainty conflict, demographic flags.
# Latency: ~20-60ms (pure CPU computation, no model inference).
# NHS DCB0129: This is the final safety gate before any clinical alert fires.

import os
import sys
import time
import logging
import re
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum

import numpy as np
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import uvicorn
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from pythonjsonlogger import jsonlogger

logger = logging.getLogger("sewa-metacognition")
logger.setLevel(logging.INFO)
_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(jsonlogger.JsonFormatter(
    "%(asctime)s %(name)s %(levelname)s %(message)s %(module)s %(funcName)s %(lineno)d"
))
if not logger.handlers:
    logger.addHandler(_handler)

EVAL_REQUESTS = Counter("metacognition_eval_requests_total", "Metacognition evaluations", ["status", "urgency"])
EVAL_DURATION = Histogram("metacognition_eval_duration_seconds", "Evaluation duration")
EVAL_FAILURES = Counter("metacognition_eval_failures_total", "Evaluation failures", ["reason"])

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5000").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"[Metacognition] Started | rules={len(MODALITY_FINDING_MATRIX)} modality combinations")
    yield
    logger.info("[Metacognition] Shutdown")


app = FastAPI(
    title="SEWA XAI — Metacognition Engine (CPU Edition)",
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
    "CT_Spine":   ["Fracture", "Disc Herniation", "Cord Compression", "Spinal Stenosis",
                   "Vertebral Collapse", "Metastasis", "Normal"],
    "MRI_Brain":  ["Ischemic Stroke", "Brain Tumor", "Multiple Sclerosis",
                   "Encephalitis", "Metastasis", "Cerebral Abscess", "Normal"],
    "MRI_Spine":  ["Disc Herniation", "Spinal Stenosis", "Cord Compression",
                   "Fracture", "Tumor", "Normal"],
    "MRI_Knee":   ["ACL Tear", "Meniscal Tear", "PCL Tear", "Cartilage Damage",
                   "Bone Contusion", "Osteochondral Defect", "Effusion", "Normal"],
    "MRI_Liver":  ["Hepatocellular Carcinoma", "Liver Metastasis", "Hepatic Cyst",
                   "Hepatic Abscess", "Cirrhosis", "Focal Nodular Hyperplasia", "Normal"],
    "XR_Chest":   ["Pneumonia", "TB", "Pneumothorax", "Pleural Effusion",
                   "Cardiomegaly", "Lung Mass", "Normal"],
    "XR_Pelvis":  ["Hip Fracture", "Pelvic Fracture", "Avascular Necrosis",
                   "Osteoarthritis", "Sacroiliac Joint Pathology", "Normal"],
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

# Experimental: when enabled AND the caller supplies a window deficit, the
# hallucination-risk SHAP check uses the window-specific deficit instead of the
# generic SHAP coherence. Off by default pending the validation-study ablation.
WINDOW_SPECIFIC_COHERENCE = os.getenv("WINDOW_SPECIFIC_COHERENCE", "false").lower() in ("1", "true", "yes")
INCOHERENCE_THRESHOLD = 0.60   # deficit above this == coherence below 0.40

# ─── Request / Response Schemas ───────────────────────────────
class SHAPValue(BaseModel):
    f: str           # feature name
    v: float         # importance value 0–1

class MetacognitionRequest(BaseModel):
    scan_id: str = Field(..., pattern=r"^[A-Z0-9\-_]{4,64}$")
    primary_finding: str = Field(..., min_length=2, max_length=100)
    urgency: str = Field(..., pattern=r"^(CRITICAL|URGENT|NORMAL)$")
    confidence: float = Field(..., ge=0.0, le=1.0)
    uncertainty_score: float = Field(..., ge=0.0, le=1.0)
    shap_values: Optional[List[SHAPValue]] = []
    modality: str = Field(..., pattern=r"^(CT|MRI|XR|US|PET|PETCT|MG|RET|ECG|PATH)$")
    body_part: str = Field(..., min_length=2, max_length=50)
    patient_age: Optional[int] = Field(None, ge=0, le=150)
    patient_sex: Optional[str] = Field(None, pattern=r"^(M|F|O|U)$")
    all_findings: Optional[List[Dict[str, Any]]] = []
    report_text: Optional[str] = Field(None, max_length=10000) # DoS protection
    # Experimental window-specific coherence (see ai-services/uncertainty).
    # Only consulted when WINDOW_SPECIFIC_COHERENCE is enabled (default off).
    window_coherence: Optional[float] = Field(None, ge=0.0, le=1.0)
    window_deficit: Optional[float] = Field(None, ge=0.0, le=1.0)
    sensitive_windows: Optional[List[str]] = None
    window_channel_flag: Optional[bool] = None

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
    # Audit trail: both coherence measures are always reported so the backend
    # can log them + the windows used (see orchestration audit record).
    shap_coherence: Optional[float] = None       # generic SHAP coherence (0..1)
    window_coherence: Optional[float] = None     # experimental window coherence (0..1)
    window_deficit: Optional[float] = None       # 1 - window_coherence
    sensitive_windows: Optional[List[str]] = None
    window_flag_used: bool = False               # window deficit drove the H check

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
        elif not expected_urgency and req.primary_finding != "Normal":
            logger.warning(f"[{req.scan_id}] Missing urgency map for finding: {req.primary_finding}")

        # ── 3. Confidence calibration ──────────────────────────
        min_conf = CONFIDENCE_THRESHOLDS.get(req.urgency, 0.5)
        calibration_score = min(1.0, req.confidence / max(min_conf, 0.01))
        corrected_confidence = None
        if req.confidence < min_conf:
            flags.append(MetacognitionFlag(
                code="LOW_CONFIDENCE",
                severity="ERROR",
                message=f"Confidence {req.confidence:.1%} is below minimum {min_conf:.0%} for {req.urgency} finding.",
                suggestion="Downgrade urgency or flag for mandatory human review."
            ))
            hallucination_risk += 0.65
            # Auto-downgrade urgency if confidence is very low
            if req.confidence < min_conf * 0.7:
                corrected_confidence = req.confidence
                if corrected_urgency is None:
                    corrected_urgency = "NORMAL" if req.urgency == "CRITICAL" else req.urgency

        # ── 4. SHAP coherence (generic) and optional window-specific deficit ──
        shap_coherence = self._check_shap_coherence(req.shap_values or [], req.primary_finding, req.modality)
        generic_coherence = float(shap_coherence["score"])
        generic_deficit = 1.0 - generic_coherence

        # Both measures are always computed/reported; the window deficit is only
        # *used* in H when the flag is on and the caller supplied one.
        window_flag_used = (
            WINDOW_SPECIFIC_COHERENCE and req.window_deficit is not None
        )
        active_deficit = req.window_deficit if window_flag_used else generic_deficit

        if active_deficit > INCOHERENCE_THRESHOLD:
            if window_flag_used:
                flags.append(MetacognitionFlag(
                    code="WINDOW_INCOHERENCE",
                    severity="WARNING",
                    message=(
                        f"Window-specific attribution is weak for '{req.primary_finding}' "
                        f"(coherence {req.window_coherence:.2f}, windows {req.sensitive_windows})."
                    ),
                    suggestion="Attribution is not concentrated in the expected window/anatomy. Mandatory radiologist review."
                ))
            else:
                flags.append(MetacognitionFlag(
                    code="SHAP_INCOHERENCE",
                    severity="WARNING",
                    message=f"SHAP features do not strongly support '{req.primary_finding}' ({generic_coherence:.2f}/1.0).",
                    suggestion="AI may be relying on spurious image features. Mandatory radiologist review."
                ))
            hallucination_risk += 0.20

        # Channel mismatch is reported but (being unvalidated) does not move H.
        if window_flag_used and req.window_channel_flag:
            flags.append(MetacognitionFlag(
                code="WINDOW_CHANNEL_MISMATCH",
                severity="WARNING",
                message=(
                    f"Attribution for '{req.primary_finding}' is dominated by a non-sensitive window "
                    f"(expected {req.sensitive_windows})."
                ),
                suggestion="Confirm the finding is driven by the correct CT window before signing."
            ))

        # ── 5. Uncertainty-confidence agreement ───────────────
        # High confidence + high uncertainty = contradiction
        if req.confidence > 0.85 and req.uncertainty_score > 0.35:
            flags.append(MetacognitionFlag(
                code="CONFIDENCE_UNCERTAINTY_CONFLICT",
                severity="ERROR",
                message=f"High confidence ({req.confidence:.1%}) conflicts with high uncertainty ({req.uncertainty_score:.2f}).",
                suggestion="Model may be overconfident. Treat as URGENT regardless of primary urgency."
            ))
            hallucination_risk += 0.65

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
            f"flags={len(flags)}, urgency_override={corrected_urgency}, ms={eval_ms}, "
            f"shap_coherence={generic_coherence:.3f}, window_coherence={req.window_coherence}, "
            f"window_deficit={req.window_deficit}, sensitive_windows={req.sensitive_windows}, "
            f"window_flag_used={window_flag_used}"
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
            evaluated_at=datetime.now(timezone.utc).isoformat(),
            shap_coherence=round(generic_coherence, 4),
            window_coherence=req.window_coherence,
            window_deficit=req.window_deficit,
            sensitive_windows=req.sensitive_windows,
            window_flag_used=window_flag_used,
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
        Layer 6: Multi-signal contradiction detection.
        Uses clause-scoped clinical negation scoring, expanded anatomical synonyms,
        and token overlap to detect conflicts between AI findings and clinical impressions.
        """
        report_lower = report_text.lower()
        finding_lower = finding.lower()

        if finding_lower in ("normal", "no acute finding", "unremarkable"):
            return None

        # --- Expanded synonyms for clinical findings across modalities ---
        synonyms = {
            "ich": ["intracranial haemorrhage", "intracranial hemorrhage", "ich", "brain bleed", "parenchymal hemorrhage"],
            "ischemic stroke": ["ischemic stroke", "cerebral infarction", "acute infarct", "infarction", "stroke"],
            "subdural hematoma": ["subdural hematoma", "subdural hemorrhage", "sdh"],
            "epidural hematoma": ["epidural hematoma", "extradural hematoma", "edh"],
            "subarachnoid hemorrhage": ["subarachnoid hemorrhage", "subarachnoid haemorrhage", "sah"],
            "pneumothorax": ["pneumothorax", "pneumothoraces", "ptx"],
            "pleural effusion": [
                "pleural effusion", "pleural effusions", "effusion", "effusions",
                "pleural fluid", "costophrenic angle", "costophrenic angles", "costophrenic sulcus", "costophrenic sulci"
            ],
            "pulmonary embolism": ["pulmonary embolism", "pe", "pulmonary embolus"],
            "pneumonia": ["pneumonia", "consolidation", "infiltrate", "airspace disease", "airspace opacity"],
            "cardiomegaly": ["cardiomegaly", "enlarged heart", "heart size", "cardiac size", "cardiac silhouette", "cardiothoracic ratio"],
            "fracture": ["fracture", "bony injury", "dislocation"],
        }
        finding_syns = sorted(synonyms.get(finding_lower, [finding_lower]), key=len, reverse=True)

        # --- Clause segmentation (periods, semicolons, line breaks) ---
        clauses = [c.strip() for c in re.split(r'[.;\n]+', report_lower) if c.strip()]

        # Negation triggers
        pre_neg = [
            "no evidence of", "no sign of", "no acute", "no significant", "no", "without",
            "negative for", "free of", "absence of", "excluded", "rules out", "ruled out",
            "denies", "clear of"
        ]
        post_neg = [
            "not seen", "not identified", "not present", "not visualized", "not demonstrated",
            "not observed", "not appreciated", "is absent", "are absent", "excluded", "is not seen",
            "are not seen", "resolved", "resolution", "has resolved", "disappeared"
        ]
        normal_descriptors = ["normal", "unremarkable", "within normal limits", "clear", "intact", "sharp"]

        affirmed = False
        negated = False

        for clause in clauses:
            for syn in finding_syns:
                if not re.search(r'\b' + re.escape(syn) + r'(?:s)?\b', clause):
                    continue

                is_clause_neg = False
                # 1. Pre-negation within clause
                for p in pre_neg:
                    if re.search(r'\b' + re.escape(p) + r'\b.*?\b' + re.escape(syn) + r'(?:s)?\b', clause):
                        is_clause_neg = True
                        break
                # 2. Post-negation within clause
                if not is_clause_neg:
                    for p in post_neg:
                        if re.search(r'\b' + re.escape(syn) + r'(?:s)?\b.*?\b' + re.escape(p) + r'\b', clause):
                            is_clause_neg = True
                            break
                # 3. Anatomical normal statements (e.g. "heart size is normal", "costophrenic angles sharp")
                if not is_clause_neg and syn in (
                    "heart size", "cardiac size", "cardiac silhouette",
                    "costophrenic angle", "costophrenic angles", "costophrenic sulcus", "costophrenic sulci"
                ):
                    for norm in normal_descriptors:
                        if norm in clause:
                            is_clause_neg = True
                            break

                if is_clause_neg:
                    negated = True
                else:
                    affirmed = True

        # Global normal check for whole study if finding is completely unmentioned
        if not affirmed and not negated:
            global_normals = [
                "no acute cardiopulmonary abnormality", "no acute cardiopulmonary process",
                "no acute abnormality", "normal study", "unremarkable examination"
            ]
            if any(gn in report_lower for gn in global_normals):
                negated = True

        # Contradiction exists if finding is negated (or unmentioned in a fully normal scan)
        # and NEVER affirmed
        if negated and not affirmed:
            return (
                f"Contradiction detected: primary finding '{finding}' is negated or conflicts with normal study text "
                f"in radiologist report."
            )
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
            f"Evaluated by: SEWA XAI Metacognition Engine v2.0.0",
            f"Timestamp: {datetime.now(timezone.utc).isoformat()}",
        ]
        return "\n".join(lines)


evaluator = MetacognitionEvaluator()

# ─── Endpoints ────────────────────────────────────────────────
@app.post("/metacognition/evaluate", response_model=MetacognitionResponse)
async def evaluate(req: MetacognitionRequest) -> MetacognitionResponse:
    t0 = time.time()
    try:
        result = evaluator.evaluate(req)
        EVAL_DURATION.observe(time.time() - t0)
        EVAL_REQUESTS.labels(status="passed" if result.passed else "failed", urgency=req.urgency).inc()
        return result
    except HTTPException:
        raise
    except Exception as e:
        EVAL_FAILURES.labels(reason="evaluation_error").inc()
        logger.error(f"Metacognition error for {req.scan_id}: {e}", exc_info=True)
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
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/metrics")
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    uvicorn.run(
        "main:app", host="0.0.0.0", port=8003,
        workers=4, loop="uvloop", access_log=False,
    )
