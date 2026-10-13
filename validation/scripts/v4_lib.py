"""v4 shared library: triage output, outcomes O1/O2/O3, signal NEG, urgency mismatch.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Implements docs/evidence/preregistration_v4.md Step 1 exactly. Everything here is
computed from the generated report and the frozen classifier output; nothing uses the
image beyond the classifier signals.
"""
from __future__ import annotations

import hashlib
import random

from validation.scripts.v4_gen import g0_report, g1_report, triage_urgency  # noqa: F401
from validation.scripts.v4_step2_negation import extract

NEG_POLARITY = ("absent", "resolved", "historical")
URG_WORDS = {
    "emergent": ("emergent", "immediate", "critical", "life-threatening", "urgent review"),
    "urgent": ("urgent", "expedite", "prompt"),
    "routine": ("routine", "no acute", "no urgent", "stable"),
}


def triage(p: float) -> dict:
    return {"prob": float(p), "decision": bool(p >= 0.5), "urgency": triage_urgency(p)}


def o1(polarity: str, y: int) -> int:
    """Unsafe report vs ground truth (prereg Step 1)."""
    if polarity == "present" and y == 0:
        return 1
    if polarity in NEG_POLARITY and y == 1:
        return 1
    if polarity == "uncertain" and y == 1:
        return 1
    return 0


def o2(polarity: str, p: float) -> int:
    """Unfaithful to the triage input (prereg Step 1)."""
    decision = p >= 0.5
    if polarity in NEG_POLARITY and decision:
        return 1
    if polarity == "present" and not decision:
        return 1
    return 0


def o3(p: float, y: int) -> int:
    return int((p >= 0.5) != bool(y))


def neg(polarity: str, p: float) -> float:
    """NEG (prereg Step 1): 1 contradiction, 0.5 confident hedge, else 0."""
    decision = p >= 0.5
    if polarity in NEG_POLARITY and decision:
        return 1.0
    if polarity == "present" and not decision:
        return 1.0
    if polarity == "uncertain" and (p >= 0.9 or p <= 0.1):
        return 0.5
    return 0.0


def report_urgency(text: str) -> str:
    t = text.lower()
    if any(w in t for w in URG_WORDS["emergent"]):
        return "emergent"
    if any(w in t for w in URG_WORDS["urgent"]):
        return "urgent"
    return "routine"


def urg_mismatch(text: str, p: float) -> int:
    return int(report_urgency(text) != triage_urgency(p))


def rows_for(prob: float, y: int, text: str) -> dict:
    pol = extract(text)["polarity"]
    return {"polarity": pol, "O1": o1(pol, y), "O2": o2(pol, prob), "O3": o3(prob, y),
            "NEG": neg(pol, prob), "URG": urg_mismatch(text, prob)}


def stable_seed(*parts) -> int:
    h = hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()
    return int(h[:8], 16)


def gen_g0(prob: float, split: str, cond: str, study: str) -> dict:
    rng = random.Random(stable_seed("g0", split, cond, study))
    return g0_report(prob, triage_urgency(prob), "top-3 highest-probability slices", rng)
