"""Tests for the v4 PART B verifier + analysis, using SYNTHETIC dummy label files.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

All inputs come from `validation/tests/make_dummy_labels.py` (dummy_* under
validation/tests/dummy_labels/), regenerated per run. No real label is read.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from validation.scripts import v4_merged_label_analysis as ana
from validation.tests import make_dummy_labels as gen

DUMMY = Path("validation/tests/dummy_labels")
RUNS = {"a": DUMMY / "dummy_run_a.json", "b": DUMMY / "dummy_run_b.json"}


@pytest.fixture(scope="module", autouse=True)
def _fixtures():
    gen.build()


def _schema(name):
    return ana.SCHEMAS[name]


def test_map_v1_rule_frozen():
    assert ana.map_v1("uncertain", True) == "ambiguous"
    assert ana.map_v1("historical", True) == "consistent"
    assert ana.map_v1("resolved", False) == "consistent"
    assert ana.map_v1("present", True) == "consistent"
    assert ana.map_v1("present", False) == "contradicts"
    assert ana.map_v1("absent", False) == "consistent"
    assert ana.map_v1("absent", True) == "contradicts"


def test_verifier_accepts_valid_filled():
    _, idc, imm, lc = _schema("blessing")
    probs = ana.verify_sheet(DUMMY / "dummy_blessing_unlabelled.xlsx",
                             DUMMY / "dummy_blessing_filled.xlsx", idc, imm, lc)
    assert probs == []


def test_verifier_rejects_tampered_text():
    _, idc, imm, lc = _schema("blessing")
    probs = ana.verify_sheet(DUMMY / "dummy_blessing_unlabelled.xlsx",
                             DUMMY / "dummy_blessing_tampered.xlsx", idc, imm, lc)
    assert probs, "tampered file must be rejected"
    assert any("report_text" in p for p in probs)


def test_verifier_rejects_bad_label_value():
    _, idc, imm, lc = _schema("blessing")
    probs = ana.verify_sheet(DUMMY / "dummy_blessing_unlabelled.xlsx",
                             DUMMY / "dummy_blessing_badlabel.xlsx", idc, imm, lc)
    assert probs, "label outside the allowed set must be rejected"
    assert any("not in" in p for p in probs)


def test_verifier_rejects_wrong_row_count(tmp_path):
    from openpyxl import load_workbook
    _, idc, imm, lc = _schema("blessing")
    wb = load_workbook(DUMMY / "dummy_blessing_filled.xlsx")
    ws = wb["Labels"]
    ws.delete_rows(2)  # drop a data row
    short = tmp_path / "short.xlsx"
    wb.save(short)
    probs = ana.verify_sheet(DUMMY / "dummy_blessing_unlabelled.xlsx", short, idc, imm, lc)
    assert any("row count" in p for p in probs)


def test_load_records_counts():
    rows, _ = ana.load_records(DUMMY / "dummy_blessing_filled.xlsx",
                               DUMMY / "dummy_dolapo_filled.xlsx",
                               DUMMY / "dummy_key.json", RUNS)
    assert len(rows) == 12
    assert sum(1 for r in rows if r["subset"]) == 6
    assert sum(1 for r in rows if r["label3"] == "ambiguous") == 2


def test_kappa_and_two_scenarios():
    rows, _ = ana.load_records(DUMMY / "dummy_blessing_filled.xlsx",
                               DUMMY / "dummy_dolapo_filled.xlsx",
                               DUMMY / "dummy_key.json", RUNS)
    pair = [r for r in rows if r["subset"] and r["label3"] and r["label2"]]
    k = ana.cohen_kappa([r["label3"] for r in pair], [r["label2"] for r in pair])
    assert k["n"] == 6 and k["kappa"] is not None
    manual = [r["label3"] for r in rows if r["label3"]]
    ext = [r["extractor_cat"] for r in rows if r["label3"]]
    assert len(manual) == 12
    s1 = ana.binary_scenario(manual, ext, "contradicts")
    s2 = ana.binary_scenario(manual, ext, "consistent")
    for s in (s1, s2):
        assert s["tp"] + s["fp"] + s["fn"] + s["tn"] == 12
    # the two scenarios treat ambiguous rows differently -> accuracies can differ
    assert s1["tp"] >= s2["tp"]


def test_kappa_ci_deterministic():
    rows, _ = ana.load_records(DUMMY / "dummy_blessing_filled.xlsx",
                               DUMMY / "dummy_dolapo_filled.xlsx",
                               DUMMY / "dummy_key.json", RUNS)
    pair = [r for r in rows if r["subset"] and r["label3"] and r["label2"]]
    a = ana.kappa_cluster_ci(pair, 500, ana.SEED)
    b = ana.kappa_cluster_ci(pair, 500, ana.SEED)
    assert a == b


def _main_args(tmp_path, blessing="dummy_blessing_filled.xlsx"):
    return ["--blessing", str(DUMMY / blessing),
            "--dolapo", str(DUMMY / "dummy_dolapo_filled.xlsx"),
            "--ref-blessing", str(DUMMY / "dummy_blessing_unlabelled.xlsx"),
            "--ref-dolapo", str(DUMMY / "dummy_dolapo_unlabelled.xlsx"),
            "--key", str(DUMMY / "dummy_key.json"),
            "--run-a", str(RUNS["a"]), "--run-b", str(RUNS["b"]),
            "--out", str(tmp_path / "out.json"),
            "--disagreements", str(tmp_path / "dis.csv")]


def test_main_end_to_end(tmp_path):
    rc = ana.main(_main_args(tmp_path))
    assert rc == 0
    data = json.loads((tmp_path / "out.json").read_text(encoding="utf-8"))
    assert data["n_ambiguous"] == 2
    assert data["n_labelled"] == 10
    assert set(data["rate_by_variant"]) == {"a", "b"}
    assert "split_by_classifier_decision" in data["rate_by_variant"]["a"]
    assert (tmp_path / "dis.csv").exists()


def test_main_stops_on_tampered(tmp_path):
    rc = ana.main(_main_args(tmp_path, blessing="dummy_blessing_tampered.xlsx"))
    assert rc == 3
    assert not (tmp_path / "out.json").exists(), "must not write analysis on mismatch"


def test_verify_only_ok(tmp_path):
    args = _main_args(tmp_path) + ["--verify-only"]
    assert ana.main(args) == 0
