"""Generate SYNTHETIC dummy label files for testing the PART B analysis + verifier.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Every file written here is fabricated (`dummy_*`) and lives ONLY under
`validation/tests/dummy_labels/`. It is never mixed with the real labelling artefacts in
`validation/labelling/`. Nothing here is a real patient or a real label.

Run directly to (re)create the fixtures:  python -m validation.tests.make_dummy_labels
"""
from __future__ import annotations

import json
from pathlib import Path

from openpyxl import Workbook

OUT = Path("validation/tests/dummy_labels")
INSTR = ("If a report both asserts and denies the finding, label it ambiguous and add a note. "
         "label = consistent | contradicts | ambiguous.")
COLS = ["new_id", "decision", "probability", "urgency", "report_text", "label", "notes",
        "instructions"]

# (variant, study, k, text, decision_present, extractor polarity, blessing label)
SCANS_A = [
    ("ID_dummyA1", 0, "Acute subdural hemorrhage is present.", True, "present", "consistent"),
    ("ID_dummyA1", 1, "No hemorrhage is seen.", True, "absent", "contradicts"),
    ("ID_dummyA1", 2, "Possible hemorrhage; uncertain.", True, "uncertain", "ambiguous"),
    ("ID_dummyA2", 0, "No hemorrhage detected.", False, "absent", "consistent"),
    ("ID_dummyA2", 1, "Hemorrhage is present.", False, "present", "contradicts"),
    ("ID_dummyA2", 2, "No hemorrhage; probability of hemorrhage is low.", False, "absent",
     "consistent"),
]
SCANS_B = [
    ("ID_dummyB1", 0, "Hemorrhage present, low probability of hemorrhage.", False, "present",
     "contradicts"),
    ("ID_dummyB1", 1, "No acute hemorrhage.", False, "absent", "consistent"),
    ("ID_dummyB1", 2, "Moderate probability of hemorrhage.", False, "uncertain", "ambiguous"),
    ("ID_dummyB2", 0, "Acute hemorrhage is present.", True, "present", "consistent"),
    ("ID_dummyB2", 1, "No hemorrhage detected.", True, "absent", "contradicts"),
    ("ID_dummyB2", 2, "Hemorrhage is unlikely.", True, "present", "contradicts"),
]
# second-labeller (dolapo) labels for a 6-row subset (some disagreements on purpose)
DOLAPO = {"R001": "consistent", "R002": "contradicts", "R004": "consistent",
          "R005": "consistent", "R007": "ambiguous", "R008": "contradicts"}
KEY_ONLY_IDS = ["R001", "R002", "R003", "R004", "R005", "R006", "R007", "R008", "R009",
                "R010", "R011", "R012"]


def _write_sheet(path: Path, rows: list[list], labels: list[str] | None = None) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Labels"
    ws.append(COLS)
    for i, r in enumerate(rows):
        lab = labels[i] if labels else ""
        ws.append([r[0], r[1], r[2], r[3], r[4], lab, "", r[5]])
    wb.save(path)


def build() -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    scans = {"a": SCANS_A, "b": SCANS_B}
    records = {"a": [], "b": []}
    key = {}
    bless_rows, dolapo_rows = [], []
    bless_labels, dolapo_labels = [], []
    nid_i = 0
    for v in ("a", "b"):
        for sri, (study, k, text, dp, pol, blab) in enumerate(scans[v]):
            nid = KEY_ONLY_IDS[nid_i]
            nid_i += 1
            prob = 0.2 if dp else 0.8  # placeholder probability value
            dec = "present" if dp else "absent"
            records[v].append({"study": study, "index": k, "prob": prob,
                               "decision_present": dp, "urgency": "routine", "k": k,
                               "seed": 1000 + nid_i, "text": text, "polarity": pol,
                               "error": None})
            key[nid] = {"variant": v, "source_row_id": sri, "study": study,
                        "index": str(k), "k": str(k), "seed": str(1000 + nid_i)}
            bless_rows.append([nid, dec, f"{prob}", "routine", text, INSTR])
            bless_labels.append(blab)
            if nid in DOLAPO:
                dolapo_rows.append([nid, dec, f"{prob}", "routine", text, INSTR])
                dolapo_labels.append(DOLAPO[nid])

    for v in ("a", "b"):
        (OUT / f"dummy_run_{v}.json").write_text(
            json.dumps({"marking": "DUMMY SYNTHETIC", "records": records[v]}, indent=2),
            encoding="utf-8")

    (OUT / "dummy_key.json").write_text(
        json.dumps({"marking": "DUMMY SYNTHETIC", "key": key}, indent=2), encoding="utf-8")

    # unlabelled references
    _write_sheet(OUT / "dummy_blessing_unlabelled.xlsx", bless_rows)
    _write_sheet(OUT / "dummy_dolapo_unlabelled.xlsx", dolapo_rows)
    # returned, valid
    _write_sheet(OUT / "dummy_blessing_filled.xlsx", bless_rows, bless_labels)
    _write_sheet(OUT / "dummy_dolapo_filled.xlsx", dolapo_rows, dolapo_labels)
    # tampered: report_text of row 0 changed
    tampered = [list(r) for r in bless_rows]
    tampered[0][4] = "TAMPERED TEXT - hemorrhage is definitely absent."
    _write_sheet(OUT / "dummy_blessing_tampered.xlsx", tampered, bless_labels)
    # bad label outside the allowed set
    bad = list(bless_labels)
    bad[1] = "maybe"
    _write_sheet(OUT / "dummy_blessing_badlabel.xlsx", bless_rows, bad)
    return {"n_blessing": len(bless_rows), "n_dolapo": len(dolapo_rows),
            "n_key": len(key), "out": str(OUT)}


if __name__ == "__main__":
    info = build()
    print("wrote dummy fixtures:", info)
