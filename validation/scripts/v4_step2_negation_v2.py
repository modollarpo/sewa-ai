"""v4 Step 2b: extractor v2 - probability-aware negation rules.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
Sentence labels are synthetic and UNREVIEWED BY A CLINICIAN.

Extractor v1 (`v4_step2_negation.extract`) does not understand probability/likelihood
phrasing ("low probability of haemorrhage", "haemorrhage is unlikely", "90% probability"),
so it mislabels such sentences. v2 adds:
  - phrase rules for low/high/moderate probability and likelihood,
  - a numeric-probability reader (e.g. "10%", "90%", "0.15 probability"),
  - a `prob_context` value on the output.
Everything else (hedge/negation/historical/resolved triggers) is reused from v1 so the
two extractors stay comparable.

The v2 rules were developed on a NEW synthetic probability set. That set is split
half/half with a fixed seed; the held-out half is reported and is NOT used to tune the
trigger lists. The 150 G1 reports are NEVER used for tuning (see the exploratory re-run,
`v4_step2c_negation_v2_g1.py`).
"""
from __future__ import annotations

import json
import re

from validation.scripts.v4_step2_negation import (
    HEDGE, HIST, NEG, RESOLVED, SPLIT, TOK, _mentions, _norm, _phrases_in, prf)

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. UNREVIEWED BY A CLINICIAN."

# --- probability-aware triggers (frozen after authoring on the dev half) ---------
PROB_LOW = ["low probability", "low likelihood", "low chance", "small chance",
            "slim chance", "remote chance", "unlikely", "not likely", "very unlikely",
            "low risk", "less likely", "probability is low", "likelihood is low"]
PROB_HIGH = ["high probability", "high likelihood", "high chance", "very likely",
             "highly likely", "likely", "probable", "high risk", "probability is high",
             "likelihood is high"]
PROB_MID = ["moderate probability", "intermediate probability", "equivocal probability",
            "indeterminate probability", "moderate likelihood", "probability is moderate",
            "indeterminate likelihood", "equivocal likelihood"]

PCT = re.compile(r"(\d{1,3}(?:\.\d+)?)\s*%")
DEC = re.compile(r"(?:probability|likelihood|chance|risk)\s*(?:of|is|=|:)?\s*(0?\.\d+)")
DEC_REV = re.compile(r"(0?\.\d+)\s*(?:probability|likelihood|chance|risk)")
# non-adjacent phrasings anywhere in the clause: "probability of X is low", "likelihood ... high"
LOW_RE = re.compile(r"(probability|likelihood|chance|risk)[^.;]*\b(low|small|slim|"
                    r"unlikely|remote|less likely|decreased)\b")
HIGH_RE = re.compile(r"(probability|likelihood|chance|risk)[^.;]*\b(high|likely|"
                     r"probable|increased)\b")
MID_RE = re.compile(r"(probability|likelihood|chance|risk)[^.;]*\b(moderate|"
                    r"intermediate|equivocal|indeterminate)\b")

LOW_PCT = 0.2   # <= 20%  -> absent
HIGH_PCT = 0.8  # >= 80%  -> present; between -> uncertain


def _prob_vals(clause: str) -> list[float]:
    vals = [float(m.group(1)) / 100.0 for m in PCT.finditer(clause)]
    vals += [float(m.group(1)) for m in DEC.finditer(clause)]
    vals += [float(m.group(1)) for m in DEC_REV.finditer(clause)]
    return vals


def _prob_polarity(clause: str, tokens: list[str], probs: list[float]):
    """Return 'absent'/'present'/'uncertain' from probability cues, else None."""
    low = _phrases_in(tokens, PROB_LOW) or bool(LOW_RE.search(clause)) or any(p <= LOW_PCT for p in probs)
    high = _phrases_in(tokens, PROB_HIGH) or bool(HIGH_RE.search(clause)) or any(p >= HIGH_PCT for p in probs)
    mid = _phrases_in(tokens, PROB_MID) or bool(MID_RE.search(clause)) or any(LOW_PCT < p < HIGH_PCT for p in probs)
    if low:
        return "absent"
    if high:
        return "present"
    if mid:
        return "uncertain"
    return None


def extract_v2(text: str) -> dict:
    """Return {polarity, mentions:[...], prob_context} with probability-aware rules."""
    if not text:
        return {"polarity": "absent", "mentions": [], "prob_context": None}
    clauses = [c for c in SPLIT.split(text) if c.strip()]
    seen = []
    prob_ctx: float | None = None
    for clause in clauses:
        norm = _norm(clause)
        tokens = [m.group(0).lower() for m in TOK.finditer(norm)]
        probs = _prob_vals(norm)
        if prob_ctx is None and probs:
            prob_ctx = probs[0]
        for mi in _mentions(tokens):
            pre = tokens[max(0, mi - 9):mi]
            post = tokens[mi + 1:mi + 6]
            here = tokens[mi:mi + 2]
            if _phrases_in(pre, HEDGE) or _phrases_in(post, HEDGE):
                pol = "uncertain"
            elif _phrases_in(pre, RESOLVED) or _phrases_in(post, RESOLVED):
                pol = "resolved"
            elif _phrases_in(pre, NEG):
                pol = "absent"
            else:
                pp = _prob_polarity(norm, tokens, probs)
                if pp is not None:
                    pol = pp
                elif _phrases_in(pre, ["acute", "new", "newly", "interval development",
                                       "increase", "increased", "increasing", "enlarging"]):
                    pol = "present"
                elif _phrases_in(pre, HIST) or _phrases_in(post, HIST):
                    pol = "historical"
                elif _phrases_in(post, ["not seen", "not identified", "not present",
                                        "not visualized", "not demonstrated", "not observed",
                                        "not appreciated", "not evident", "is absent",
                                        "are absent", "is not", "are not", "no longer",
                                        "not detected", "excluded", "not found"]):
                    pol = "absent"
                else:
                    pol = "present"
            seen.append({"clause": clause.strip(), "mention": " ".join(tokens[mi:mi + 2]),
                         "polarity": pol})
    if not seen:
        return {"polarity": "absent", "mentions": [], "prob_context": prob_ctx}
    order = {"present": 0, "uncertain": 1, "historical": 2, "resolved": 3, "absent": 4}
    best = sorted(seen, key=lambda d: order[d["polarity"]])[0]["polarity"]
    return {"polarity": best, "mentions": seen, "prob_context": prob_ctx}


# --- new synthetic probability set --------------------------------------------
SITES = ["subdural", "epidural", "subarachnoid", "intraventricular", "intraparenchymal",
         "cerebral", "cerebellar", "frontal", "parietal", "temporal"]
P_CASES = {
    "p_affirm": [
        "High probability of a {s} hemorrhage.",
        "There is a high likelihood of a {s} hematoma.",
        "A {s} hemorrhage is likely.",
        "Findings are consistent with a {s} hemorrhage; probability 90%.",
        "The probability of a {s} hemorrhage is high.",
        "90% probability of a {s} hemorrhage.",
        "A {s} hematoma is very likely.",
        "95% likelihood of an acute {s} hemorrhage.",
    ],
    "p_negate": [
        "Low probability of a {s} hemorrhage.",
        "A {s} hemorrhage is unlikely.",
        "There is a low likelihood of a {s} hematoma.",
        "10% chance of a {s} hemorrhage.",
        "The probability of a {s} hemorrhage is low.",
        "5% probability of an acute {s} hemorrhage.",
        "Unlikely to represent a {s} hemorrhage.",
        "A {s} hematoma is very unlikely.",
    ],
    "p_uncertain": [
        "Moderate probability of a {s} hemorrhage.",
        "Intermediate probability of a {s} hematoma.",
        "50% probability of a {s} hemorrhage.",
        "Equivocal probability of an acute {s} hemorrhage.",
        "There is an indeterminate likelihood of a {s} hematoma.",
        "Probability of a {s} hemorrhage is moderate.",
        "Cannot exclude a {s} hemorrhage; probability 50%.",
        "Possible {s} hemorrhage; equivocal probability.",
    ],
    "p_scoped": [
        "No mass effect, but a high probability of a {s} hemorrhage.",
        "No midline shift; however, a {s} hemorrhage is likely.",
        "Ventricles are normal, yet 90% probability of a {s} hemorrhage.",
        "No skull fracture, but a {s} hematoma is probable.",
    ],
    "p_distract": [
        "Probability of a {s} hemorrhage is low; no mass effect.",
        "No evidence of a {s} hemorrhage; 5% probability.",
        "The {s} hemorrhage is absent; likelihood low.",
        "White matter is unremarkable; low likelihood of a {s} hemorrhage.",
    ],
}
P_EXPECTED = {"p_affirm": "present", "p_negate": "absent", "p_uncertain": "uncertain",
              "p_scoped": "present", "p_distract": "absent"}

P_HAND = [
    ("p_affirm", "A 0.9 probability of a subdural hematoma."),
    ("p_affirm", "Subdural hemorrhage is probable; 85% likelihood."),
    ("p_negate", "A 0.05 probability of a subdural hematoma."),
    ("p_negate", "Low chance of subarachnoid hemorrhage."),
    ("p_uncertain", "The likelihood of a subdural hematoma is indeterminate."),
    ("p_uncertain", "Borderline probability (~45%) of an epidural hematoma."),
    ("p_scoped", "No extra-axial collection; however, high probability of a subdural hemorrhage."),
    ("p_distract", "No hemorrhage; probability of a subdural hematoma is low (5%)."),
]


def build_prob_set() -> list[dict]:
    rows = []
    for cat, tmpls in P_CASES.items():
        for site in SITES:
            for t in tmpls:
                rows.append({"text": t.format(s=site), "label": P_EXPECTED[cat], "cat": cat})
    for cat, text in P_HAND:
        rows.append({"text": text, "label": P_EXPECTED[cat], "cat": cat})
    seen, out = set(), []
    for r in rows:
        if r["text"] not in seen:
            seen.add(r["text"])
            out.append(r)
    return out


def split_prob(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    import random
    rnd = random.Random(43)
    dev, hold = [], []
    for cat in P_CASES:
        sub = [r for r in rows if r["cat"] == cat]
        rnd.shuffle(sub)
        h = len(sub) // 2
        dev += sub[:h]
        hold += sub[h:]
    return dev, hold


def _eval(part: list[dict], extractor) -> dict:
    gold = [r["label"] for r in part]
    pred = [extractor(r["text"])["polarity"] for r in part]
    acc = sum(1 for g, p in zip(gold, pred) if g == p) / len(part) if part else None
    fails = [{"text": r["text"], "gold": g, "pred": p, "cat": r["cat"]}
             for r, g, p in zip(part, gold, pred) if g != p]
    return {"n": len(part), "accuracy": acc, "per_class": prf(gold, pred, ["present", "absent", "uncertain"]),
            "failures": fails}


if __name__ == "__main__":
    from validation.scripts.v4_step2_negation import extract as v1
    rows = build_prob_set()
    dev, hold = split_prob(rows)
    labels = ["present", "absent", "uncertain"]
    res = {"marking": MARK, "n_total": len(rows), "n_dev": len(dev), "n_holdout": len(hold),
           "extractor": "v2 (probability-aware)"}
    for name, part in (("dev", dev), ("holdout", hold)):
        v2res = _eval(part, extract_v2)
        v1res = _eval(part, v1)
        res[name] = {"v2": v2res, "v1_baseline": {"accuracy": v1res["accuracy"]}}
        print(f"\n[{name}] n={len(part)} v2 accuracy={v2res['accuracy']:.3f} "
              f"(v1 baseline {v1res['accuracy']:.3f})")
        for lab in labels:
            m = v2res["per_class"][lab]
            print(f"  {lab:9s} P={m['precision']} R={m['recall']} F1={m['f1']} support={m['support']}")
        for f in v2res["failures"][:20]:
            print(f"    FAIL gold={f['gold']:9s} pred={f['pred']:9s} cat={f['cat']:11s} | {f['text']}")

    with open("validation/reports/v4_negation_v2.json", "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=2)
    with open("validation/scripts/v4_negation_v2_set.json", "w", encoding="utf-8") as fh:
        json.dump({"marking": MARK, "dev": dev, "holdout": hold}, fh, indent=2)
    print("\nwrote validation/reports/v4_negation_v2.json + v4_negation_v2_set.json")
