"""v4 Step 2b: independent adversarial negation set (frozen before evaluation).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
Sentence labels are synthetic and UNREVIEWED BY A CLINICIAN.

These sentences are worded to differ from the Step-2 template families and to probe
synonym/paraphrase gaps (e.g. 'blood'/'bleed', 'subsided', 'suspicion', 'could reflect').
Use:  python v4_step2b_adversarial.py --write   # dump set + clinician pack (COMMIT)
      python v4_step2b_adversarial.py --eval    # run extractor ONCE on the frozen set
Only dev-half failures may inform rule fixes; the holdout is reported once.
"""
from __future__ import annotations

import csv
import json
import sys

from validation.scripts.v4_step2_negation import MARK, extract, prf

DEV = [
    ("present", "Acute hemorrhage is present within the right subarachnoid space."),
    ("present", "There is gross blood in the left subdural space."),
    ("present", "Hemorrhage fills the fourth ventricle."),
    ("present", "The epidural collection is hemorrhagic."),
    ("present", "A bleed is noted along the falx."),
    ("present", "Hyperdense material within the interhemispheric fissure consistent with blood."),
    ("present", "There is a large right basal ganglia hematoma extending into the ventricle."),
    ("present", "Acute on chronic subdural hemorrhage is demonstrated."),
    ("present", "Blood is seen layering in the occipital horn."),
    ("present", "A punctate hemorrhagic focus is present in the left frontal lobe."),
    ("present", "Extensive subarachnoid hemorrhage fills the basal cisterns."),
    ("present", "Increase in the size of the right subdural hematoma compared with prior imaging."),
    ("absent", "No hemorrhagic focus is identified."),
    ("absent", "There is no blood within the ventricles."),
    ("absent", "Hemorrhage is not evident."),
    ("absent", "No evidence of intracranial blood products."),
    ("absent", "The subdural spaces are free of hematoma."),
    ("absent", "No acute hemorrhage is present on this examination."),
    ("absent", "There is no intra-axial hemorrhage."),
    ("absent", "Hemorrhage has been excluded."),
    ("absent", "No hyperdense extra-axial collection is seen."),
    ("absent", "There is no subarachnoid blood."),
    ("absent", "No intraparenchymal hemorrhagic focus."),
    ("absent", "Hemorrhage is absent from the ventricles."),
    ("uncertain", "Hemorrhage is favored but not certain."),
    ("uncertain", "A tiny focus of hemorrhage is suggested."),
    ("uncertain", "Findings may indicate a hemorrhagic component."),
    ("uncertain", "The finding could reflect a small hematoma."),
    ("uncertain", "Suspicion for subarachnoid hemorrhage."),
    ("uncertain", "A hemorrhagic component cannot be fully excluded."),
    ("uncertain", "Mild hyperdensity may represent hemorrhage."),
    ("uncertain", "A subtle bleed cannot be excluded."),
    ("uncertain", "There is low concern but hemorrhage is not entirely excluded."),
    ("uncertain", "Indeterminate focus of increased density, possibly hemorrhage."),
    ("uncertain", "Possible tiny punctate hemorrhage."),
    ("uncertain", "Questionable small subdural hematoma."),
    ("historical", "This is an old hemorrhage."),
    ("historical", "Hemorrhage is chronic and stable."),
    ("historical", "The patient has a history of subdural hematoma."),
    ("historical", "Prior hemorrhage is noted."),
    ("historical", "Recurrent chronic subdural hematoma."),
    ("historical", "Longstanding intraventricular hemorrhage."),
    ("historical", "Hemorrhage seen on prior imaging is unchanged."),
    ("historical", "Pre-existing left frontal hemorrhage."),
    ("resolved", "The hemorrhage has subsided."),
    ("resolved", "The hematoma has almost completely resolved."),
    ("resolved", "There has been interval resolution of the subdural hematoma."),
    ("resolved", "Prior hemorrhage, no longer visible."),
    ("resolved", "The subdural collection has decreased substantially."),
    ("resolved", "Previous epidural hematoma, now reabsorbed."),
    ("resolved", "The hemorrhage has essentially cleared."),
    ("resolved", "Marked interval improvement in the subarachnoid hemorrhage."),
    ("absent", "No acute intracranial abnormality identified."),
    ("absent", "The gray-white matter differentiation is preserved."),
    ("absent", "Age-appropriate cerebral volume."),
    ("absent", "No midline shift."),
    ("absent", "There is no mass effect or herniation."),
    ("absent", "The ventricles are normal."),
    ("absent", "No midline or extra-axial fluid collection."),
    ("absent", "Sulcal spaces are preserved."),
]

HOLD = [
    ("present", "A right frontal hematoma with surrounding edema is present."),
    ("present", "There is blood along the tentorium."),
    ("present", "Hemorrhage is seen within the left lateral ventricle."),
    ("present", "The extra-axial collection demonstrates hemorrhagic signal."),
    ("present", "An acute bleed is present in the left parietal region."),
    ("present", "Hyperdensity consistent with hemorrhage is present in the subarachnoid space."),
    ("present", "There is a large intraparenchymal hematoma."),
    ("present", "Acute subdural and subarachnoid hemorrhages are present."),
    ("present", "Blood is present in the prepontine cistern."),
    ("present", "A focus of hemorrhage is present within the corpus callosum."),
    ("present", "There is extensive intraventricular hemorrhage."),
    ("present", "The right subdural hematoma has increased in size."),
    ("absent", "No hemorrhagic collection is demonstrated."),
    ("absent", "There is no evidence of blood in the subarachnoid space."),
    ("absent", "Hemorrhage is absent."),
    ("absent", "No acute or chronic hemorrhage is identified."),
    ("absent", "The extra-axial spaces are free of blood."),
    ("absent", "No hematoma is present."),
    ("absent", "There is no intraventricular blood."),
    ("absent", "Hemorrhage was not identified."),
    ("absent", "No bleeding is evident."),
    ("absent", "No parenchymal hemorrhage is seen."),
    ("absent", "There is no subdural hematoma."),
    ("absent", "No evidence of hemorrhagic transformation."),
    ("uncertain", "Hemorrhage is possible but not confirmed."),
    ("uncertain", "A subtle bleed cannot be excluded."),
    ("uncertain", "Question of a small subdural hematoma."),
    ("uncertain", "Findings are equivocal for hemorrhage."),
    ("uncertain", "Mild hyperdensity may represent hemorrhage."),
    ("uncertain", "A hemorrhagic component cannot be fully excluded."),
    ("uncertain", "Possible tiny focus of hemorrhage."),
    ("uncertain", "There is low concern but hemorrhage is not entirely excluded."),
    ("uncertain", "The finding could reflect a small hematoma."),
    ("uncertain", "Suspicion for subarachnoid hemorrhage."),
    ("uncertain", "A definite hemorrhage is not seen, though it cannot be excluded."),
    ("uncertain", "Indeterminate focus of increased density, possibly hemorrhage."),
    ("historical", "Old blood is present in the right frontal lobe."),
    ("historical", "This hemorrhage predates the current admission."),
    ("historical", "Chronic subdural hematoma, unchanged."),
    ("historical", "A remote hemorrhagic focus is seen."),
    ("historical", "Hemorrhage from a previous admission is present."),
    ("historical", "Interval stability of a known intraventricular hemorrhage."),
    ("historical", "The extra-axial hemorrhage is longstanding."),
    ("historical", "Sequela of prior subarachnoid hemorrhage."),
    ("resolved", "The hematoma has diminished considerably."),
    ("resolved", "Hemorrhage has completely disappeared."),
    ("resolved", "The subdural hematoma is no longer present."),
    ("resolved", "The previously seen hemorrhage has fully absorbed."),
    ("resolved", "Resolution of the prior subarachnoid hemorrhage."),
    ("resolved", "The hematoma has largely cleared."),
    ("resolved", "Interval decrease in the size of the epidural hematoma."),
    ("resolved", "Previous hemorrhage has resolved."),
    ("absent", "No acute intracranial process."),
    ("absent", "The white matter is unremarkable."),
    ("absent", "No herniation."),
    ("absent", "Cerebral sulci are normal."),
    ("absent", "No significant mass effect."),
    ("absent", "Fourth ventricle is normal."),
    ("absent", "No extra-axial fluid."),
    ("absent", "No midline deviation."),
]


def _rows(pairs):
    return [{"text": t, "gold": g} for g, t in pairs]


def write() -> None:
    data = {"marking": MARK, "provenance": "adversarial, paraphrased; frozen before eval",
            "dev": _rows(DEV), "holdout": _rows(HOLD)}
    with open("validation/scripts/v4_negation_adversarial_set.json", "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
    pack = [("id", "sentence", "proposed_label", "clinician_label", "comment")]
    for i, (g, t) in enumerate(DEV + HOLD, 1):
        pack.append((f"adv-{i:03d}", t, g, "", ""))
    with open("validation/reports/v4_extractor_clinician_review.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(pack[0])
        w.writerows(pack[1:])
    print(f"wrote set (dev {len(DEV)} / holdout {len(HOLD)}) + clinician pack "
          f"({len(DEV)+len(HOLD)} sentences, unreviewed by a clinician)")


def evaluate() -> None:
    with open("validation/scripts/v4_negation_adversarial_set.json", encoding="utf-8") as fh:
        data = json.load(fh)
    labels = ["present", "absent", "uncertain", "historical", "resolved"]
    res = {"marking": MARK, "frozen_set": "v4_negation_adversarial_set.json"}
    for name in ("dev", "holdout"):
        part = data[name]
        gold = [r["gold"] for r in part]
        pred = [extract(r["text"])["polarity"] for r in part]
        acc = sum(1 for g, p in zip(gold, pred) if g == p) / len(part)
        res[name] = {"n": len(part), "accuracy": acc, "per_class": prf(gold, pred, labels),
                     "cases": [{"text": r["text"], "gold": g, "pred": p}
                               for r, g, p in zip(part, gold, pred)]}
        print(f"\n[{name}] n={len(part)} accuracy={acc:.3f}")
        for lab in labels:
            m = res[name]["per_class"][lab]
            print(f"  {lab:11s} P={m['precision']} R={m['recall']} F1={m['f1']} support={m['support']}")
        for r, g, p in zip(part, gold, pred):
            if g != p:
                print(f"    FAIL gold={g:9s} pred={p:9s} | {r['text']}")
    with open("validation/reports/v4_negation_adversarial.json", "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=2)
    print("\nwrote validation/reports/v4_negation_adversarial.json")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "--write":
        write()
    elif mode == "--eval":
        evaluate()
    else:
        print("usage: v4_step2b_adversarial.py --write | --eval")
        sys.exit(1)
