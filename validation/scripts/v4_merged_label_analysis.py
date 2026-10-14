"""v4 PART B: verify + analyse the RETURNED labels for the G1/G1b report-negation study.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

This single entrypoint does everything needed once the human labels come back:

  (a) STRICT VERIFIER - each returned sheet is checked against its hashed unlabelled
      original: same rows (same order), same ids, same immutable columns (decision,
      probability, urgency, report_text, instructions); the ONLY columns allowed to change
      are the label columns (label / notes / label_2); label values must come from the
      allowed set. Any other difference -> MISMATCH -> exit 3 and STOP.
  (b) inter-labeller agreement: Cohen's kappa (SEWA vs second labeller) on the subset,
      with a scan-cluster bootstrap 95% CI and the list of disagreements.
  (c) extractor v1 -> manual 3-category mapping rule (FIXED; see
      docs/evidence/preregistration_v4_g1_labels.md):
        uncertain                  -> ambiguous
        historical / resolved      -> consistent
        present + decision_present -> consistent ; present + decision_absent -> contradicts
        absent  + decision_absent  -> consistent ; absent  + decision_present -> contradicts
      3x3 confusion + exact accuracy, and the two ambiguity scenarios for the binary
      comparison (ambiguous counted as contradicts, and as consistent).
  (d) the manual contradiction rate split by classifier decision (present / absent).
  (e) the manual contradiction rate per prompt variant (a = G1, b = G1b) with scan-cluster
      bootstrap 95% CIs (resampling the 50 StudyInstanceUID clusters).

Labels are only read here; nothing here tunes on the reports. The mapping rule and the
ambiguity handling are frozen in the pre-registration BEFORE any labels are seen.

Usage:
  python -m validation.scripts.v4_merged_label_analysis --verify-only \
      --sewa <returned> --dolapo <returned>
  python -m validation.scripts.v4_merged_label_analysis \
      --sewa <returned> --dolapo <returned> --key <key.json>
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

import numpy as np

from validation.scripts.v4_labels_io import label_to_bool, norm_label, read_rows

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
LABELS3 = ("consistent", "contradicts", "ambiguous")
SEED = 20261014

# reference = the committed, hashed unlabelled sheets; returned = the filled copies.
SEWA_REF = Path("validation/labelling/sewa_labelling_sheet.xlsx")
DOLAPO_REF = Path("validation/labelling/dolapo_subset_sheet.xlsx")
CLIN_REF = Path("validation/labelling/clinician_review_sheet.xlsx")
MERGED_REF = Path("validation/reports/v4_g1_merged_labelling_sheet.csv")
HASHES = Path("docs/evidence/label_hashes.txt")

RUN_JSONS = {"a": Path("validation/reports/v4_g1_qwen.json"),
             "b": Path("validation/reports/v4_g1_qwen_b.json")}

CLIN_VALUES = ("present", "absent", "uncertain", "historical", "resolved")

# id column -> (immutable columns, {column: allowed values or None})
SCHEMAS = {
    "sewa": (SEWA_REF, "new_id",
                 ["new_id", "decision", "probability", "urgency", "report_text", "instructions"],
                 {"label": LABELS3, "notes": None}),
    "dolapo": (DOLAPO_REF, "new_id",
               ["new_id", "decision", "probability", "urgency", "report_text", "instructions"],
               {"label": LABELS3, "notes": None}),
    "clinician": (CLIN_REF, "id", ["id", "sentence"],
                  {"clinician_label": CLIN_VALUES, "comment": None}),
    "merged": (MERGED_REF, "new_id",
               ["new_id", "decision", "probability", "urgency", "report_text",
                "second_labeller_subset", "instructions"],
               {"label": LABELS3, "label_2": LABELS3, "notes": None}),
}


# --------------------------------------------------------------------------- hashing
def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _s(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


# --------------------------------------------------------------------------- (a) verifier
def verify_sheet(reference: Path, returned: Path, id_col: str, immutable: list[str],
                 label_cols: dict) -> list[str]:
    """Return a list of problems (empty = OK)."""
    problems: list[str] = []
    allowed = set(label_cols)
    try:
        ref = read_rows(reference)
        ret = read_rows(returned)
    except FileNotFoundError as e:
        return [f"missing file: {e}"]
    if len(ref) != len(ret):
        problems.append(f"row count differs: reference={len(ref)} returned={len(ret)}")
    n = min(len(ref), len(ret))
    for i in range(n):
        a, b = ref[i], ret[i]
        if _s(a.get(id_col)) != _s(b.get(id_col)):
            problems.append(f"row {i}: id differs ref={_s(a.get(id_col))!r} "
                            f"ret={_s(b.get(id_col))!r}")
            continue
        rid = _s(b.get(id_col))
        for col in immutable:
            if _s(a.get(col)) != _s(b.get(col)):
                problems.append(f"{rid}: immutable column '{col}' changed "
                                f"(ref={_s(a.get(col))[:60]!r} ret={_s(b.get(col))[:60]!r})")
        for col, val in b.items():
            if col in immutable or col in allowed:
                continue
            if _s(val) and _s(a.get(col)) != _s(val):
                problems.append(f"{rid}: unexpected change in column '{col}' "
                                f"(only {sorted(allowed)} may be filled)")
        for col, allowed_vals in label_cols.items():
            if not allowed_vals:
                continue
            v = _s(b.get(col)).lower()
            if v and v not in allowed_vals:
                problems.append(f"{rid}: '{col}' = {v!r} not in {list(allowed_vals)}")
    return problems


def _check_reference_hash(ref: Path) -> list[str]:
    if not HASHES.exists():
        return []
    for line in HASHES.read_text(encoding="utf-8").splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[1] == ref.as_posix():
            if sha256(ref) != parts[0]:
                return [f"reference {ref} no longer matches recorded SHA-256"]
    return []


def verify_all(sewa: Path, dolapo: Path,
               sewa_ref: Path = SEWA_REF, dolapo_ref: Path = DOLAPO_REF) -> dict:
    out = {}
    for name, returned, ref in (("sewa", sewa, sewa_ref),
                                ("dolapo", dolapo, dolapo_ref)):
        _, id_col, immutable, label_cols = SCHEMAS[name]
        out[name] = _check_reference_hash(ref) + verify_sheet(ref, returned, id_col,
                                                              immutable, label_cols)
    return out


# --------------------------------------------------------------------------- stats
def cohen_kappa(a: list, b: list, labels=LABELS3) -> dict:
    pairs = [(x, y) for x, y in zip(a, b) if x is not None and y is not None]
    n = len(pairs)
    if n == 0:
        return {"kappa": None, "n": 0, "po": None, "pe": None}
    po = sum(1 for x, y in pairs if x == y) / n
    cx, cy = Counter(x for x, _ in pairs), Counter(y for _, y in pairs)
    pe = sum((cx[l] / n) * (cy[l] / n) for l in labels)
    return {"kappa": (po - pe) / (1 - pe) if pe != 1 else None, "n": n, "po": po, "pe": pe}


def kappa_cluster_ci(rows: list[dict], n_boot: int, seed: int) -> dict:
    base = cohen_kappa([r["label3"] for r in rows], [r["label2"] for r in rows])
    by_scan: dict[str, list] = {}
    for r in rows:
        by_scan.setdefault(str(r["study"]), []).append(r)
    scans = list(by_scan)
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n_boot):
        pick = rng.choice(len(scans), size=len(scans), replace=True)
        sub = [r for i in pick for r in by_scan[scans[i]]]
        k = cohen_kappa([r["label3"] for r in sub], [r["label2"] for r in sub])["kappa"]
        if k is not None:
            vals.append(k)
    lo = hi = None
    if vals:
        lo, hi = (float(x) for x in np.percentile(vals, [2.5, 97.5]))
    return {"kappa": base["kappa"], "n": base["n"], "n_scans": len(scans),
            "ci_low": lo, "ci_high": hi, "n_boot": n_boot, "n_valid_boot": len(vals)}


def rate_cluster_ci(rows: list[dict], n_boot: int, seed: int) -> dict:
    by_scan: dict[str, dict] = {}
    for r in rows:
        if r["label"] is None:
            continue
        d = by_scan.setdefault(str(r["study"]), {"n": 0, "k": 0})
        d["n"] += 1
        d["k"] += int(r["label"])
    scans = list(by_scan)
    if not scans:
        return {"rate": None, "ci_low": None, "ci_high": None, "n_scans": 0, "n_reports": 0}
    pooled = sum(by_scan[s]["k"] for s in scans) / sum(by_scan[s]["n"] for s in scans)
    rng = np.random.default_rng(seed)
    boots = np.empty(n_boot)
    for b in range(n_boot):
        pick = rng.choice(len(scans), size=len(scans), replace=True)
        den = sum(by_scan[scans[i]]["n"] for i in pick)
        num = sum(by_scan[scans[i]]["k"] for i in pick)
        boots[b] = num / den if den else np.nan
    lo, hi = np.nanpercentile(boots, [2.5, 97.5])
    return {"rate": pooled, "ci_low": float(lo), "ci_high": float(hi),
            "n_scans": len(scans), "n_reports": int(sum(by_scan[s]["n"] for s in scans)),
            "n_boot": n_boot}


# --------------------------------------------------------------------------- (c) mapping
def map_v1(polarity: str, decision_present: bool) -> str:
    """Extractor v1 -> manual 3-category rule (FROZEN in the pre-registration)."""
    p = (polarity or "").strip().lower()
    if p == "uncertain":
        return "ambiguous"
    if p in ("historical", "resolved"):
        return "consistent"
    if p == "present":
        return "consistent" if decision_present else "contradicts"
    if p == "absent":
        return "contradicts" if decision_present else "consistent"
    return "ambiguous"


def confusion3(manual: list[str], ext: list[str], labels=LABELS3) -> dict:
    m = {l: {e: 0 for e in labels} for l in labels}
    for man, ex in zip(manual, ext):
        if man in m and ex in m[man]:
            m[man][ex] += 1
    correct = sum(m[l][l] for l in labels)
    total = sum(sum(m[l].values()) for l in labels)
    return {"matrix_manual_rows_extractor_cols": m, "correct": correct, "total": total,
            "accuracy": correct / total if total else None}


def binary_scenario(lab3: list[str], ext3: list[str], ambiguous_as: str) -> dict:
    def manb(x):
        if x == "contradicts":
            return True
        if x == "ambiguous":
            return ambiguous_as == "contradicts"
        return False

    def extb(x):
        return x == "contradicts"

    tp = sum(1 for m, e in zip(lab3, ext3) if manb(m) and extb(e))
    fp = sum(1 for m, e in zip(lab3, ext3) if not manb(m) and extb(e))
    fn = sum(1 for m, e in zip(lab3, ext3) if manb(m) and not extb(e))
    tn = sum(1 for m, e in zip(lab3, ext3) if not manb(m) and not extb(e))
    total = len(lab3)
    return {"ambiguous_counted_as": ambiguous_as, "tp": tp, "fp": fp, "fn": fn, "tn": tn,
            "accuracy": (tp + tn) / total if total else None,
            "precision": tp / (tp + fp) if (tp + fp) else None,
            "recall": tp / (tp + fn) if (tp + fn) else None}


# --------------------------------------------------------------------------- assemble
def load_records(sewa: Path, dolapo: Path, key_path: Path,
                 run_jsons: dict | None = None) -> tuple[list[dict], list[str]]:
    """Join key + run JSONs + the two labelled sheets into analysis rows."""
    notes: list[str] = []
    key = json.loads(Path(key_path).read_text(encoding="utf-8"))["key"]
    run_jsons = run_jsons or RUN_JSONS
    runs = {}
    for v, p in run_jsons.items():
        p = Path(p)
        runs[v] = ([r for r in json.loads(p.read_text(encoding="utf-8")).get("records", [])
                    if r.get("text")] if p.exists() else [])
    sewa_rows = {str(r.get("new_id", "")).strip(): r for r in read_rows(Path(sewa))}
    dol = {str(r.get("new_id", "")).strip(): r for r in read_rows(Path(dolapo))}

    rows = []
    for nid, meta in key.items():
        variant, sri = meta["variant"], int(meta["source_row_id"])
        rec = runs.get(variant, [])[sri] if sri < len(runs.get(variant, [])) else None
        if rec is None:
            continue
        b = sewa_rows.get(nid, {})
        d = dol.get(nid, {})
        rows.append({
            "new_id": nid, "variant": variant, "study": meta["study"],
            "decision_present": bool(rec.get("decision_present")),
            "extractor_polarity": rec.get("polarity"),
            "extractor_cat": map_v1(rec.get("polarity"), bool(rec.get("decision_present"))),
            "label3": norm_label(b.get("label")), "label": label_to_bool(b.get("label")),
            "label_raw": str(b.get("label", "")),
            "label2": norm_label(d.get("label")) if d else None,
            "subset": nid in dol, "text": rec.get("text"),
        })
    return rows, notes


# --------------------------------------------------------------------------- main
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sewa", default=str(SEWA_REF))
    ap.add_argument("--dolapo", default=str(DOLAPO_REF))
    ap.add_argument("--ref-sewa", default=str(SEWA_REF))
    ap.add_argument("--ref-dolapo", default=str(DOLAPO_REF))
    ap.add_argument("--key", default="validation/reports/v4_g1_merged_key_PRIVATE.json")
    ap.add_argument("--run-a", default=str(RUN_JSONS["a"]))
    ap.add_argument("--run-b", default=str(RUN_JSONS["b"]))
    ap.add_argument("--out", default="validation/reports/v4_g1_merged_analysis.json")
    ap.add_argument("--disagreements", default="validation/reports/v4_g1_disagreements.csv")
    ap.add_argument("--verify-only", action="store_true")
    ap.add_argument("--boot", type=int, default=5000)
    args = ap.parse_args(argv)

    for p in (args.sewa, args.dolapo):
        if not Path(p).exists():
            print(f"missing {p}", flush=True)
            return 2

    # (a) verify returned vs hashed originals
    checks = verify_all(Path(args.sewa), Path(args.dolapo),
                        Path(args.ref_sewa), Path(args.ref_dolapo))
    bad = {k: v for k, v in checks.items() if v}
    print(MARK)
    for name, probs in checks.items():
        if probs:
            print(f"[verify {name}] MISMATCH ({len(probs)}):")
            for p in probs[:25]:
                print("   -", p)
            if len(probs) > 25:
                print(f"   ... and {len(probs) - 25} more")
        else:
            print(f"[verify {name}] OK")
    if bad:
        print("STOP: verification failed. Do not proceed to analysis.")
        return 3
    if args.verify_only:
        print("verification passed (verify-only).")
        return 0

    if not Path(args.key).exists():
        print(f"missing {args.key}", flush=True)
        return 2

    rows, _ = load_records(Path(args.sewa), Path(args.dolapo), Path(args.key),
                           {"a": args.run_a, "b": args.run_b})
    labelled = [r for r in rows if r["label"] is not None]
    if not any(r["label3"] for r in rows):
        print("no usable labels (sewa label column empty?)", flush=True)
        return 2

    # (b) inter-labeller kappa on the subset
    pair = [r for r in rows if r["subset"] and r["label3"] and r["label2"]]
    kappa = kappa_cluster_ci(pair, args.boot, SEED)
    disagreements = [{"new_id": r["new_id"], "variant": r["variant"], "sewa": r["label3"],
                      "second_labeller": r["label2"], "text": r["text"]}
                     for r in pair if r["label3"] != r["label2"]]

    # (c) extractor v1 vs manual
    manual = [r["label3"] for r in rows if r["label3"]]
    ext = [r["extractor_cat"] for r in rows if r["label3"]]
    conf3 = confusion3(manual, ext)
    scenarios = {"ambiguous_as_contradicts": binary_scenario(manual, ext, "contradicts"),
                 "ambiguous_as_consistent": binary_scenario(manual, ext, "consistent")}

    # (d)+(e) rates by variant, split by classifier decision, scan-cluster bootstrap
    by_variant = {}
    for v in ("a", "b"):
        vr = [r for r in labelled if r["variant"] == v]
        split = {("present" if present else "absent"):
                 rate_cluster_ci([r for r in vr if r["decision_present"] == present],
                                 args.boot, SEED)
                 for present in (True, False)}
        by_variant[v] = {
            "all": rate_cluster_ci(vr, args.boot, SEED),
            "split_by_classifier_decision": split,
            "extractor_flagged_rate": (sum(1 for r in vr if r["extractor_cat"] == "contradicts")
                                       / len(vr)) if vr else None,
            "n_ambiguous": sum(1 for r in rows
                               if r["variant"] == v and r["label3"] == "ambiguous"),
        }

    out = {
        "marking": MARK, "frozen_rule": "docs/evidence/preregistration_v4_g1_labels.md",
        "n_rows": len(rows), "n_labelled": len(labelled),
        "n_ambiguous": sum(1 for r in rows if r["label3"] == "ambiguous"),
        "n_blank": sum(1 for r in rows if r["label3"] is None),
        "label_counts": dict(Counter(r["label_raw"].strip().lower() for r in rows)),
        "extractor_v1_mapping_rule": {
            "uncertain": "ambiguous", "historical|resolved": "consistent",
            "present&decision_present": "consistent", "present&decision_absent": "contradicts",
            "absent&decision_absent": "consistent", "absent&decision_present": "contradicts"},
        "inter_labeller_kappa": kappa,
        "disagreements": disagreements,
        "extractor_v1_vs_manual": {"confusion3": conf3, "scenarios": scenarios},
        "rate_by_variant": by_variant,
    }
    Path(args.out).write_text(json.dumps(out, indent=2), encoding="utf-8")
    with Path(args.disagreements).open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["new_id", "variant", "sewa", "second_labeller",
                                          "text"])
        w.writeheader()
        w.writerows(disagreements)

    print(f"labelled={len(labelled)} ambiguous={out['n_ambiguous']} of {len(rows)}")
    print(f"kappa={kappa['kappa']} 95% CI [{kappa['ci_low']}, {kappa['ci_high']}] n={kappa['n']} "
          f"scans={kappa['n_scans']}; disagreements={len(disagreements)}")
    print(f"extractor v1 exact 3-class accuracy={conf3['accuracy']}; "
          f"binary (amb->contradicts)={scenarios['ambiguous_as_contradicts']['accuracy']} "
          f"(amb->consistent)={scenarios['ambiguous_as_consistent']['accuracy']}")
    for v in ("a", "b"):
        d, s = by_variant[v]["all"], by_variant[v]["split_by_classifier_decision"]
        print(f"variant {v}: rate={d['rate']} CI [{d['ci_low']}, {d['ci_high']}] over "
              f"{d['n_scans']} scans; present={s['present']['rate']} absent={s['absent']['rate']}")
    print("wrote", args.out, "and", args.disagreements, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
