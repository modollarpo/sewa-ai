"""Tests for v4 extractor v2 (probability-aware), blinded exporter and label analysis.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import csv
import json

import pytest

from validation.scripts.v4_step2_negation import extract as extract_v1
from validation.scripts.v4_step2_negation_v2 import (
    build_prob_set, extract_v2, split_prob)
from validation.scripts.v4_g1_export_blinded import build_rows
from validation.scripts.v4_g1_label_analysis import (
    _label_to_bool, cluster_bootstrap, load_joined)


# --- extractor v2 probability rules ------------------------------------------
@pytest.mark.parametrize("text,want", [
    ("High probability of a subdural hemorrhage.", "present"),
    ("90% probability of a subarachnoid hemorrhage.", "present"),
    ("A subdural hemorrhage is likely.", "present"),
    ("The probability of a subdural hemorrhage is high.", "present"),
    ("Low probability of an epidural hemorrhage.", "absent"),
    ("10% chance of a subdural hemorrhage.", "absent"),
    ("A subdural hemorrhage is unlikely.", "absent"),
    ("The probability of a cerebral hemorrhage is low.", "absent"),
    ("5% probability of an acute subdural hemorrhage.", "absent"),
    ("A 0.05 probability of a subdural hematoma.", "absent"),
    ("A 0.9 probability of a subdural hematoma.", "present"),
    ("Moderate probability of a subdural hemorrhage.", "uncertain"),
    ("50% probability of a subdural hemorrhage.", "uncertain"),
    ("Probability of a temporal hemorrhage is moderate.", "uncertain"),
    ("Cannot exclude a subdural hemorrhage; probability 50%.", "uncertain"),
    ("No evidence of a subdural hemorrhage; 5% probability.", "absent"),
])
def test_extract_v2_probability(text, want):
    assert extract_v2(text)["polarity"] == want


def test_v2_beats_v1_on_probability_phrasing():
    text = "The probability of a subdural hemorrhage is low."
    assert extract_v1(text)["polarity"] == "present"   # v1 ignores probability
    assert extract_v2(text)["polarity"] == "absent"    # v2 reads it


def test_extract_v2_prob_context():
    assert extract_v2("Low probability of hemorrhage; 10%.")["prob_context"] == pytest.approx(0.10)


def test_extract_v2_empty():
    assert extract_v2("")["polarity"] == "absent"


def test_v2_frozen_set_dev_and_holdout_perfect():
    rows = build_prob_set()
    dev, hold = split_prob(rows)
    for part in (dev, hold):
        acc = sum(1 for r in part if extract_v2(r["text"])["polarity"] == r["label"]) / len(part)
        assert acc == 1.0


def test_prob_set_disjoint_dev_holdout():
    rows = build_prob_set()
    dev, hold = split_prob(rows)
    assert not ({r["text"] for r in dev} & {r["text"] for r in hold})
    assert len(dev) + len(hold) == len(rows)


# --- blinded exporter ---------------------------------------------------------
def test_blinded_sheet_hides_extractor(tmp_path):
    records = [
        {"study": "s1", "index": 3, "k": 0, "seed": 1, "prob": 0.9,
         "decision_present": True, "urgency": "emergent", "text": "Hemorrhage present.",
         "polarity": "present", "contradiction": False},
        {"study": "s1", "index": 3, "k": 1, "seed": 2, "prob": 0.9,
         "decision_present": True, "urgency": "emergent", "text": "Low probability.",
         "polarity": "absent", "contradiction": True},
    ]
    rows = build_rows(records, seed=1)
    assert len(rows) == 2
    assert "polarity" not in rows[0] and "contradiction" not in rows[0]
    assert set(rows[0]) >= {"row_id", "decision", "probability", "urgency", "report_text",
                            "label", "notes", "clinician_signoff"}
    assert rows[0]["decision"] == "present"


# --- label analysis -----------------------------------------------------------
@pytest.mark.parametrize("raw,want", [
    ("contradicts", True), ("consistent", False), ("ambiguous", None), ("", None),
    ("CONTRADICTS", True), ("yes", True), ("no", False),
])
def test_label_to_bool(raw, want):
    assert _label_to_bool(raw) is want


def test_cluster_bootstrap_perfect():
    rows = [{"study": "s1", "label": True}, {"study": "s1", "label": True},
            {"study": "s2", "label": True}, {"study": "s2", "label": True}]
    assert cluster_bootstrap(rows, n_boot=200)["rate"] == 1.0


def test_load_joined_confusion(tmp_path):
    run = {"records": [
        {"study": "s1", "decision_present": False, "text": "There is a hemorrhage.",
         "polarity": "present"},
        {"study": "s2", "decision_present": True, "text": "No hemorrhage.",
         "polarity": "absent"},
    ]}
    jp = tmp_path / "run.json"
    jp.write_text(json.dumps(run), encoding="utf-8")
    cp = tmp_path / "labels.csv"
    with cp.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["row_id", "label", "notes"])
        w.writerow([0, "contradicts", ""])   # extractor flag=True, label=True  -> TP
        w.writerow([1, "consistent", ""])    # extractor flag=True, label=False -> FP
    rows = load_joined(cp, jp, "v1")
    assert rows[0]["extractor_contradiction"] is True and rows[0]["label"] is True
    assert rows[1]["extractor_contradiction"] is True and rows[1]["label"] is False
