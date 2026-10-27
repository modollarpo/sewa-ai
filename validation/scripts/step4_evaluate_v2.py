"""Step 4 & 5 (v2 fast): Evaluate on Test A (clean) with single-pass and MC dropout (batch size 32).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score

from validation.scripts.step3_train_val import RSNASliceDataset, MANIFEST
from validation.study.model import build_model
from validation.study.signals import risk_max_softmax, risk_entropy, normalized_U, risk_conflict


def main() -> int:
    meta_path = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    print("Loading test dataset (Test A)...", flush=True)
    test_ds = RSNASliceDataset(manifest["test"]["study_uids"], manifest, meta_path)
    test_loader = DataLoader(test_ds, batch_size=32, shuffle=False, num_workers=0)

    model, _ = build_model(dropout=0.3, pretrained=True)
    device = torch.device("cpu")
    model.to(device)

    ckpt = torch.load("validation/models/classifier_v2.pt", weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    T = ckpt["temperature"]
    model.eval()

    print(f"Loaded v2 model (val AUROC: {ckpt['val_auroc']:.4f}, T: {T:.4f})", flush=True)

    print("Running evaluation on Test A...", flush=True)
    all_probs = []
    all_u = []
    all_labels = []

    for x, y in test_loader:
        x = x.to(device)
        model.train()
        probs_passes = []
        for _ in range(20):
            logits = model(x) / T
            p = torch.softmax(logits, dim=1)[:, 1].detach().cpu().numpy()
            probs_passes.append(p)
        model.eval()

        probs_stack = np.stack(probs_passes, axis=0)  # (20, batch)
        mean_p = probs_stack.mean(axis=0)
        epistemic = probs_stack.var(axis=0)
        aleatoric = mean_p * (1.0 - mean_p)
        u = 0.6 * epistemic + 0.4 * aleatoric
        norm_u = u / 0.15

        all_probs.extend(mean_p)
        all_u.extend(norm_u)
        all_labels.extend(y.numpy())

    all_probs = np.array(all_probs)
    all_u = np.array(all_u)
    all_labels = np.array(all_labels)

    test_auroc = roc_auc_score(all_labels, all_probs)
    print(f"Test A (clean) slice-level AUROC: {test_auroc:.4f}", flush=True)

    b1_risk = risk_max_softmax(all_probs)
    b2_risk = risk_entropy(all_probs)
    c4_risk = risk_conflict(all_probs, all_u, all_u)

    preds = (all_probs >= 0.5).astype(int)
    is_error = (preds != all_labels).astype(int)

    err_auroc_b1 = roc_auc_score(is_error, b1_risk)
    err_auroc_c4 = roc_auc_score(is_error, c4_risk)

    print(f"Test A Error-detection AUROC (B1 max-softmax): {err_auroc_b1:.4f}", flush=True)
    print(f"Test A Error-detection AUROC (C4 conflict):   {err_auroc_c4:.4f}", flush=True)

    summary = {
        "test_auroc": float(test_auroc),
        "err_auroc_b1": float(err_auroc_b1),
        "err_auroc_c4": float(err_auroc_c4),
        "test_samples": len(all_labels),
        "test_error_rate": float(is_error.mean()),
    }
    out_path = Path("validation/reports/study_report_v2.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"Report saved to {out_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
