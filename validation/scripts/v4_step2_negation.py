"""v4 Step 2: rule-based haemorrhage negation extractor + synthetic test set.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
Sentence labels are synthetic and UNREVIEWED BY A CLINICIAN.

Extractor outputs, for haemorrhage: present | absent | uncertain | historical | resolved.
If a sentence mentions no haemorrhage, the default is `absent` (no finding asserted);
this is documented as a limitation of the synthetic evaluation.

Rules are hand-authored from NegEx/pyConText principles (no third-party package, so
licence is our own code). The set is split half/half; the held-out half is reported and
is not used to tune the trigger lists.
"""
from __future__ import annotations

import json
import re
from collections import Counter

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. UNREVIEWED BY A CLINICIAN."

# --- trigger lists (frozen after authoring on the dev half) -------------------
HEDGE = ["cannot exclude", "cannot be excluded", "cannot rule out", "cannot be ruled out",
         "can not exclude", "not excluded", "cannot entirely", "cannot be entirely",
         "cannot confidently", "cannot be confidently", "cannot be fully excluded",
         "not entirely excluded", "fully excluded",
         "may represent", "may be", "may reflect", "may indicate", "possibly", "possible",
         "consideration", "suggested", "suggestive", "suspicion", "could represent",
         "could reflect", "not certain", "favored", "question of", "questionable", "equivocal",
         "indeterminate", "uncertain", "cannot be assessed", "suspicious", "concerning for"]
RESOLVED = ["resolved", "resolving", "reabsorbed", "reabsorbing", "absorbed", "improved", "improving",
            "improvement", "subsided", "diminished", "disappeared", "no longer", "interval resolution",
            "resolution", "decreased", "decreasing", "decrease", "reduced", "smaller", "less conspicuous",
            "cleared", "has cleared"]
NEG = ["no evidence", "no", "not", "without", "denies", "denial", "absence", "negative",
       "free", "excluded", "unremarkable", "rules out", "ruled out"]
HIST = ["history of", "history", "prior", "previous", "previously", "old", "chronic", "remote",
        "longstanding", "long-standing", "pre-existing", "preexisting", "known", "treated",
        "status post", "s/p", "healed", "documented", "predates", "predating", "habitual"]
POST_NEG = ["not seen", "not identified", "not present", "not visualized", "not demonstrated",
            "not observed", "not appreciated", "not evident", "is absent", "are absent",
            "is not", "are not", "no longer", "not detected", "excluded", "not found",
            "not been seen", "not been identified", "not been demonstrated",
            "not been visualized", "not been observed", "has not been"]
TERMINATORS = ["but", "however", "although", "though", "whereas", "while", "except", "yet"]

HEM_START = ("hemorrhag", "hematom", "haematom", "contusion")
SITE = {"subdural", "epidural", "extradural", "subarachnoid", "intraventricular",
        "intraparenchymal", "intracerebral", "parenchymal", "cerebral", "cortical", "intra-axial"}
ABBR = {"sdh", "edh", "sah", "ivh", "iph", "ich"}
TOK = re.compile(r"[A-Za-z0-9/\-]+")
SPLIT = re.compile(r"(?<=[.;])\s+|\s+(?:but|however|although|though|whereas|while|except|yet)\s+", re.I)


def _norm(s: str) -> str:
    s = s.lower()
    return s.replace("haemorrhage", "hemorrhage").replace("haematoma", "hematoma")


def _phrases_in(tokens: list[str], phrases: list[str]) -> bool:
    joined = " ".join(tokens)
    for p in phrases:
        if re.search(r"(?:^|\s)" + re.escape(p) + r"(?:\s|$)", joined):
            return True
    return False


def _mentions(tokens: list[str]) -> list[int]:
    idx = []
    for i, t in enumerate(tokens):
        if t.startswith(("hemorrhag", "hematom", "contusion", "blood", "bleed")) or t in ABBR:
            idx.append(i)
    return idx


def extract(text: str) -> dict:
    """Return {polarity, mentions:[...], per_clause:[...]}."""
    clauses = [c for c in SPLIT.split(text) if c.strip()]
    seen = []
    for clause in clauses:
        tokens = [m.group(0).lower() for m in TOK.finditer(_norm(clause))]
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
            elif _phrases_in(pre, ["acute", "new", "newly", "interval development",
                                   "increase", "increased", "increasing", "enlarging"]):
                pol = "present"
            elif _phrases_in(pre, HIST) or _phrases_in(post, HIST):
                pol = "historical"
            elif _phrases_in(post, POST_NEG) or _phrases_in(here + post, ["is not", "are not"]):
                pol = "absent"
            else:
                pol = "present"
            seen.append({"clause": clause.strip(), "mention": " ".join(tokens[mi:mi + 2]), "polarity": pol})
    if not seen:
        return {"polarity": "absent", "mentions": [], "per_clause": []}
    order = {"present": 0, "uncertain": 1, "historical": 2, "resolved": 3, "absent": 4}
    best = sorted(seen, key=lambda d: order[d["polarity"]])[0]["polarity"]
    return {"polarity": best, "mentions": seen, "per_clause": seen}


# --- synthetic set ------------------------------------------------------------
SITES = ["subdural", "epidural", "subarachnoid", "intraventricular", "intraparenchymal",
         "cerebral", "cerebellar", "frontal", "parietal", "temporal"]
CASES = {
    "affirmation": [
        "There is an acute {s} hemorrhage.",
        "Findings consistent with a {s} hemorrhage.",
        "A left {s} hematoma is demonstrated.",
        "The study shows a {s} hemorrhage.",
        "Acute {s} hemorrhage is present.",
        "A hyperdense {s} hematoma is seen.",
        "New {s} hemorrhage identified.",
        "Focal hyperdensity in keeping with a {s} hematoma.",
    ],
    "negation": [
        "No evidence of a {s} hemorrhage.",
        "There is no {s} hemorrhage.",
        "A {s} hemorrhage is not seen.",
        "No acute {s} hemorrhage is identified.",
        "The {s} hemorrhage is absent.",
        "No {s} collection is present.",
        "There is no convincing evidence of a {s} hemorrhage.",
        "No {s} hemorrhage, hematoma, or collection.",
    ],
    "hedged": [
        "Cannot exclude a small {s} hemorrhage.",
        "A {s} hemorrhage cannot be ruled out.",
        "Possible {s} hemorrhage.",
        "A {s} hemorrhage is not excluded.",
        "There may be a {s} hemorrhage.",
        "A {s} hemorrhage is a consideration.",
        "Mild hyperdensity that may reflect a {s} hemorrhage.",
        "A {s} hemorrhage cannot be entirely dismissed.",
    ],
    "scoped": [
        "No mass effect, but there is an acute {s} hemorrhage.",
        "No midline shift; however, a {s} hemorrhage is present.",
        "No skull fracture, but a {s} hematoma is demonstrated.",
        "Ventricles are normal, yet a {s} hemorrhage is seen.",
        "No hydrocephalus, but acute {s} hemorrhage is present.",
        "No intraventricular hemorrhage, but a large {s} hemorrhage is present.",
        "No mass effect; however, an acute {s} hemorrhage is demonstrated.",
        "Sulci are effaced, but an acute {s} hemorrhage is seen.",
    ],
    "historical": [
        "Chronic left {s} hematoma.",
        "History of a {s} hemorrhage.",
        "Prior {s} hematoma.",
        "Old {s} hemorrhage.",
        "A previously documented {s} hematoma.",
        "Healed {s} hemorrhage.",
        "Previously seen {s} hematoma, stable.",
        "Known chronic {s} hematoma, stable.",
    ],
    "resolved": [
        "The {s} hemorrhage has resolved.",
        "Resolved {s} hemorrhage.",
        "A {s} hematoma is resolving.",
        "Previously seen {s} hemorrhage now cleared.",
        "The {s} hemorrhage is no longer seen.",
        "The previously noted {s} hemorrhage has largely resolved.",
        "Near-complete resolution of the {s} hematoma.",
        "Interval improvement of the {s} hemorrhage.",
    ],
    "distractor": [
        "No midline shift or mass effect.",
        "Mild cerebral volume loss.",
        "The ventricles are normal in size.",
        "Cannot exclude mass effect.",
        "No hydrocephalus.",
        "Mild sulcal effacement.",
        "No skull fracture.",
        "White matter is unremarkable.",
        "No extra-axial fluid collection or midline shift.",
        "Sulci and ventricles are age-appropriate.",
    ],
}
EXPECTED = {
    "affirmation": "present", "negation": "absent", "hedged": "uncertain",
    "scoped": "present", "historical": "historical", "resolved": "resolved",
    "distractor": "absent",
}

# hand-written variants (used in both halves; not rule-fitted)
HAND = [
    ("affirmation", "Acute right subdural and subarachnoid hemorrhage are present."),
    ("affirmation", "There is a large intraparenchymal hematoma with surrounding edema."),
    ("negation", "No subdural, epidural or subarachnoid hemorrhage is present."),
    ("negation", "The intraventricular hemorrhage has not been seen on this study."),
    ("negation", "Without evidence of any cortical hemorrhage."),
    ("hedged", "Although no definite hemorrhage is seen, subarachnoid hemorrhage cannot be excluded."),
    ("hedged", "Equivocal increased density that could represent a small subdural hematoma."),
    ("hedged", "No definitive acute hemorrhage, however a {s} hemorrhage is not excluded."),
    ("scoped", "No subdural hematoma; there is, however, a subarachnoid hemorrhage."),
    ("scoped", "No evidence of mass effect but acute left subdural hematoma is present."),
    ("historical", "Known chronic subdural hematoma, stable."),
    ("historical", "Status post evacuation of a prior epidural hematoma."),
    ("resolved", "Prior subarachnoid hemorrhage, now resolved."),
    ("resolved", "Interval improvement of the previously seen subdural hematoma."),
    ("distractor", "No extra-axial fluid collection or mass effect."),
    ("distractor", "No evidence of midline shift."),
    ("distractor", "Sulci and ventricles are age-appropriate."),
    ("distractor", "No mass effect, no midline shift, no hydrocephalus."),
]


HARD = [
    ("present", "Small acute right subdural hematoma, not associated with mass effect or midline shift."),
    ("absent", "There is no evidence to support the presence of a subdural hematoma."),
    ("absent", "No hemorrhage is identified; no mass effect is present."),
    ("uncertain", "The possibility of a subarachnoid hemorrhage cannot be entirely dismissed."),
    ("historical", "No acute hemorrhage identified, although a chronic subdural hematoma persists."),
    ("present", "Interval development of an intraparenchymal hemorrhage."),
    ("resolved", "The small subdural hematoma has essentially resolved since the prior study."),
    ("present", "Acute subarachnoid hemorrhage with no intraventricular extension."),
    ("absent", "No cortical contusion or extra-axial hemorrhage."),
    ("uncertain", "Subtle hyperdensity along the tentorium, possibly representing subarachnoid hemorrhage."),
    ("historical", "Stable chronic bilateral subdural hematomas."),
    ("present", "Large left epidural hematoma with mass effect."),
    ("absent", "No evidence of acute intracranial hemorrhage."),
    ("uncertain", "Mild prepontine hyperdensity; a small subarachnoid hemorrhage cannot be confidently excluded."),
    ("absent", "No intraventricular or subarachnoid hemorrhage."),
    ("present", "Right frontal intraparenchymal hematoma with surrounding edema."),
    ("resolved", "Prior subdural hematoma, resolved on the current examination."),
    ("historical", "Known remote cerebellar hemorrhage, unchanged."),
    ("present", "An acute subdural hemorrhage is present despite the absence of mass effect."),
    ("absent", "The brain is unremarkable with no hemorrhage."),
]


def build_set() -> list[dict]:
    rows = []
    for cat, tmpls in CASES.items():
        for si, site in enumerate(SITES):
            for t in tmpls:
                if "{s}" in t:
                    rows.append({"text": t.format(s=site), "label": EXPECTED[cat], "cat": cat})
                else:
                    rows.append({"text": t, "label": EXPECTED[cat], "cat": cat})
    for cat, text in HAND:
        rows.append({"text": text.format(s="subdural"), "label": EXPECTED[cat], "cat": cat})
    # dedupe, stable
    seen, out = set(), []
    for r in rows:
        if r["text"] not in seen:
            seen.add(r["text"])
            out.append(r)
    return out


def split(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    import random
    rnd = random.Random(43)
    dev, hold = [], []
    for cat in CASES:
        sub = [r for r in rows if r["cat"] == cat]
        rnd.shuffle(sub)
        h = len(sub) // 2
        dev += sub[:h]
        hold += sub[h:]
    return dev, hold


def prf(gold: list[str], pred: list[str], labels: list[str]) -> dict:
    out = {}
    for lab in labels:
        tp = sum(1 for g, p in zip(gold, pred) if g == lab and p == lab)
        fp = sum(1 for g, p in zip(gold, pred) if g != lab and p == lab)
        fn = sum(1 for g, p in zip(gold, pred) if g == lab and p != lab)
        pr = tp / (tp + fp) if tp + fp else None
        rc = tp / (tp + fn) if tp + fn else None
        f1 = (2 * pr * rc / (pr + rc)) if (pr and rc) else None
        out[lab] = {"precision": pr, "recall": rc, "f1": f1, "support": sum(1 for g in gold if g == lab)}
    return out


if __name__ == "__main__":
    rows = build_set()
    dev, hold = split(rows)
    labels = ["present", "absent", "uncertain", "historical", "resolved"]
    res = {"marking": MARK, "n_total": len(rows), "n_dev": len(dev), "n_holdout": len(hold),
           "holdout": {}, "dev": {}}
    for name, part in (("holdout", hold), ("dev", dev)):
        gold = [r["label"] for r in part]
        pred = [extract(r["text"])["polarity"] for r in part]
        acc = sum(1 for g, p in zip(gold, pred) if g == p) / len(part)
        res[name] = {"accuracy": acc, "per_class": prf(gold, pred, labels), "n": len(part)}
        fails = [{"text": r["text"], "gold": g, "pred": p, "cat": r["cat"]}
                 for r, g, p in zip(part, gold, pred) if g != p]
        res[name]["failures"] = fails[:40]
        print(f"\n[{name}] n={len(part)} accuracy={acc:.3f}")
        for lab in labels:
            m = res[name]["per_class"][lab]
            print(f"  {lab:11s} P={m['precision']} R={m['recall']} F1={m['f1']} support={m['support']}")
        for f in fails[:20]:
            print(f"    FAIL gold={f['gold']:9s} pred={f['pred']:9s} cat={f['cat']:10s} | {f['text']}")

    with open("validation/reports/v4_negation_extractor.json", "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=2)
    with open("validation/scripts/v4_negation_set.json", "w", encoding="utf-8") as fh:
        json.dump({"marking": MARK, "dev": dev, "holdout": hold, "hard": HARD}, fh, indent=2)

    hard_gold = [g for g, _ in HARD]
    hard_pred = [extract(t)["polarity"] for _, t in HARD]
    hard_acc = sum(1 for g, p in zip(hard_gold, hard_pred) if g == p) / len(HARD)
    res["hard_adversarial"] = {"accuracy": hard_acc, "n": len(HARD),
                               "per_class": prf(hard_gold, hard_pred, labels),
                               "cases": [{"text": t, "gold": g, "pred": p}
                                         for (g, t), p in zip(HARD, hard_pred)]}
    print(f"\n[hard adversarial, author-inspected] n={len(HARD)} accuracy={hard_acc:.3f}")
    for c in res["hard_adversarial"]["cases"]:
        flag = "ok " if c["gold"] == c["pred"] else "FAIL"
        print(f"    {flag} gold={c['gold']:9s} pred={c['pred']:9s} | {c['text']}")
    with open("validation/reports/v4_negation_extractor.json", "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=2)
    print("\nwrote validation/reports/v4_negation_extractor.json + v4_negation_set.json")
