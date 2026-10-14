"""Step 8 unit tests for the v4 report-negation study.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
Pure/offline: no network, no tiles, no model. Covers the extractor, the frozen NEG/O1/
O2/O3 rules, urgency mismatch, deterministic G0 generation, manifest grouping + leakage,
and the metrics used by the evaluator.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

import numpy as np
import pytest

from validation.scripts.v4_step2_negation import extract
from validation.scripts import v4_lib as V
from validation.study.metrics import auroc, unsafe_accepted_per_1000

SCRIPTS = Path("validation/scripts")


# --------------------------------------------------------------- extractor
def test_extractor_present():
    assert extract("Acute intraparenchymal hemorrhage is present.")["polarity"] == "present"


def test_extractor_absent():
    assert extract("No evidence of acute subdural hemorrhage.")["polarity"] == "absent"


def test_extractor_uncertain():
    assert extract("Possible acute subdural hemorrhage; cannot be excluded.")["polarity"] == "uncertain"


def test_extractor_historical():
    assert extract("There is a history of subdural hemorrhage.")["polarity"] == "historical"


def test_extractor_resolved():
    assert extract("The subdural hematoma has resolved.")["polarity"] == "resolved"


def test_extractor_no_mention_defaults_absent():
    assert extract("No mass effect.")["polarity"] == "absent"


# --------------------------------------------------------------- NEG rules (prereg Step 1)
@pytest.mark.parametrize("pol,p,want", [
    ("present", 0.95, 0.0),
    ("absent", 0.95, 1.0),
    ("resolved", 0.80, 1.0),
    ("present", 0.05, 1.0),
    ("absent", 0.05, 0.0),
    ("uncertain", 0.95, 0.5),
    ("uncertain", 0.05, 0.5),
    ("uncertain", 0.50, 0.0),
])
def test_neg_rules(pol, p, want):
    assert V.neg(pol, p) == pytest.approx(want)


# --------------------------------------------------------------- outcomes
@pytest.mark.parametrize("pol,y,want", [
    ("present", 0, 1), ("present", 1, 0),
    ("absent", 1, 1), ("absent", 0, 0),
    ("resolved", 1, 1), ("historical", 1, 1),
    ("uncertain", 1, 1), ("uncertain", 0, 0),
])
def test_o1(pol, y, want):
    assert V.o1(pol, y) == want


@pytest.mark.parametrize("pol,p,want", [
    ("absent", 0.9, 1), ("present", 0.1, 1),
    ("present", 0.9, 0), ("absent", 0.1, 0),
    ("uncertain", 0.95, 0), ("uncertain", 0.05, 0),
])
def test_o2(pol, p, want):
    assert V.o2(pol, p) == want


@pytest.mark.parametrize("p,y,want", [(0.9, 0, 1), (0.9, 1, 0), (0.1, 0, 0), (0.5, 1, 0)])
def test_o3(p, y, want):
    assert V.o3(p, y) == want


def test_urgency_mismatch():
    assert V.urg_mismatch("Findings are emergent.", 0.95) == 0
    assert V.urg_mismatch("Findings are emergent.", 0.2) == 1


def test_triage_thresholds():
    assert V.triage(0.5)["decision"] is True
    assert V.triage(0.499)["decision"] is False
    assert V.triage(0.95)["urgency"] == "emergent"
    assert V.triage(0.6)["urgency"] == "urgent"
    assert V.triage(0.2)["urgency"] == "routine"


# --------------------------------------------------------------- G0 determinism + injection
def test_g0_deterministic():
    a = V.gen_g0(0.9, "test", "clean", "studyX")
    b = V.gen_g0(0.9, "test", "clean", "studyX")
    assert a["text"] == b["text"] and a["extracted"] == b["extracted"]


def test_g0_injection_rate_is_about_10pct():
    rng = random.Random(3)
    inj = sum(1 for _ in range(2000)
              if V.gen_g0(rng.random(), "val", "clean", f"s{_}")["injected"] != "none")
    assert 0.06 < inj / 2000 < 0.14


def test_g0_faithful_report_extracts_to_triage_decision():
    for p in (0.95, 0.6, 0.2, 0.05):
        rec = V.gen_g0(p, "test", "clean", f"det-{p}")
        if rec["injected"] == "none":
            assert (rec["extracted"] == "present") == (p >= 0.5)


# --------------------------------------------------------------- grouping + leakage
def _load(name):
    return json.loads((SCRIPTS / name).read_text(encoding="utf-8"))


def test_v4_val_test_disjoint_and_grouped():
    m = _load("step2_manifest_v4.json")
    val, test = set(m["val"]["study_uids"]), set(m["test"]["study_uids"])
    assert val and test
    assert not (val & test), "v4 val/test overlap"
    assert all(isinstance(s, str) and s for s in (val | test))


def test_v4_disjoint_from_v2_and_v3():
    m4 = _load("step2_manifest_v4.json")
    v4 = set(m4["val"]["study_uids"]) | set(m4["test"]["study_uids"])
    v2 = _load("step2_manifest_v2.json")
    used2 = set()
    for sp in ("train", "val", "test"):
        used2 |= set(v2[sp]["study_uids"])
    v3 = set(_load("step2_manifest_v3.json")["study_uids"])
    assert not (v4 & used2), "leakage vs v2"
    assert not (v4 & v3), "leakage vs v3"


def test_v4_slices_unique_and_per_study():
    slices = _load("step1b_slices_v4.json")["splits"]
    ids = [e["image_id"] for sp in ("val", "test") for e in slices[sp]]
    assert len(ids) == len(set(ids)), "duplicate slice ids"
    for sp in ("val", "test"):
        by_study: dict = {}
        for e in slices[sp]:
            by_study.setdefault(e["study"], []).append(e)
        assert all(len(v) <= 8 for v in by_study.values())
        assert len(by_study) == len({e["study"] for e in slices[sp]})


# --------------------------------------------------------------- metrics
def test_auroc_perfect_and_inverse():
    err = np.array([0, 0, 1, 1], dtype=bool)
    assert auroc(np.array([1., 2, 3, 4]), err) == pytest.approx(1.0)
    assert auroc(np.array([4, 3, 2, 1]), err) == pytest.approx(0.0)


def test_unsafe_accepted_per_1000_zero_error():
    assert unsafe_accepted_per_1000(np.zeros(10), np.zeros(10, dtype=bool), 0.2) == 0.0


# --- G1 runner (Qwen2.5 text-only generator) ---
from validation.scripts.v4_g1_qwen import parse_output, is_contradiction  # noqa: E402


def test_g1_parse_output_extracts_reply():
    stdout = (
        "Loading model...\n\nbuild : b11583\navailable commands:\n  /exit\n\n"
        "> Triage: haemorrhage probability 0.90; urgency emergent; attribution top-slice.\n"
        "There is an intracranial haemorrhage.\n\n[ Prompt: 13.1 t/s | Generation: 6.3 t/s ]\n"
        "Exiting...\n"
    )
    assert parse_output(stdout) == "There is an intracranial haemorrhage."


def test_g1_parse_output_multiline_reply():
    stdout = "> q\nfindings may represent\nan acute haemorrhage.\n[ Prompt: 1 t/s ]\n"
    assert parse_output(stdout) == "findings may represent an acute haemorrhage."


@pytest.mark.parametrize("pol,dec,want", [
    ("present", True, False),
    ("present", False, True),
    ("absent", True, True),
    ("absent", False, False),
    ("uncertain", True, False),
    ("uncertain", False, False),
    (None, True, False),
])
def test_g1_contradiction_rule(pol, dec, want):
    assert is_contradiction(pol, dec) is want
