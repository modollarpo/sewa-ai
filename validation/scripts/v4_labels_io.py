"""v4 PART B: shared IO for reading labelled sheets (xlsx or csv).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

The unlabelled artefacts are gzip-free .xlsx (sewa/dolapo/clinician) built by
`v4_build_labelling_xlsx.py`; labels are filled by humans into the same columns. This
module reads either .xlsx or .csv, returns ordered records keyed by `new_id` (or `id`),
and normalises label strings.

Nothing here interprets medical content; it only moves strings around.
"""
from __future__ import annotations

import csv
from pathlib import Path

LABELS = ("consistent", "contradicts", "ambiguous")


def read_rows(path: Path, sheet: str | None = None) -> list[dict]:
    """Read rows (list of dicts) from .xlsx (named sheet or 'Labels'/'Instructions+Labels')
    or .csv. Only the first data sheet is used for xlsx."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)
    if path.suffix.lower() in (".xlsx", ".xlsm"):
        from openpyxl import load_workbook
        wb = load_workbook(path, data_only=True, read_only=True)
        name = sheet
        if name is None:
            name = "Labels" if "Labels" in wb.sheetnames else wb.sheetnames[-1]
        ws = wb[name]
        it = ws.iter_rows(values_only=True)
        try:
            header = [str(h) if h is not None else "" for h in next(it)]
        except StopIteration:
            return []
        rows = []
        for values in it:
            if values is None:
                continue
            row = {header[i]: ("" if values[i] is None else values[i])
                   for i in range(len(header))}
            if any(str(v).strip() for v in row.values()):
                rows.append({k: (str(v) if not isinstance(v, str) else v)
                             for k, v in row.items()})
        wb.close()
        return rows
    with path.open(encoding="utf-8-sig", newline="") as f:
        return [dict(r) for r in csv.DictReader(f)]


def norm_label(lab) -> str | None:
    s = ("" if lab is None else str(lab)).strip().lower()
    if s in ("contradicts", "contradict"):
        return "contradicts"
    if s in ("consistent", "agree"):
        return "consistent"
    if s in ("ambiguous", "unsure", "unclear"):
        return "ambiguous"
    return None


def label_to_bool(lab):
    n = norm_label(lab)
    if n == "contradicts":
        return True
    if n == "consistent":
        return False
    return None


def index_by_id(rows: list[dict], id_key: str = "new_id") -> dict[str, dict]:
    out = {}
    for r in rows:
        rid = str(r.get(id_key, "")).strip()
        if rid:
            out[rid] = r
    return out
