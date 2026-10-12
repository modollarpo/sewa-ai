"""Step 3 (v2 fast): Train EfficientNet-B0 for 1 epoch on v2 train split, calibrate T on val.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score

from validation.scripts.step3_train_val import RSNASliceDataset, MANIFEST
from validation.study.model import build_model

def main() -> int:
    meta_path = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    print("Building datasets...", flush=True)
    train_ds = RSNASliceDataset(manifest["train"]["study_uids"], manifest, meta_path)
    val_ds = RSNASliceDataset(manifest["val"]["study_uids"], manifest, meta_path)

    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False, num_workers=0)

    model, _ = build_model(dropout=0.3, pretrained=True)
    device = torch.device("cpu")
    model.to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-3)
    criterion = nn.CrossEntropyLoss()

    print("Training for 1 epoch (CPU)...", flush=True)
    model.train()
    total_loss = 0.0
    for x, y in train_loader:
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad()
        logits = model(x)
        loss = criterion(logits, y.long())
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * len(y)
    avg_loss = total_loss / len(train_ds)
    print(f"  Epoch 1/1 - Loss: {avg_loss:.4f}", flush=True)

    # Evaluate on val
    model.eval()
    val_preds, val_labels = [], []
    with torch.no_grad():
        for x, y in val_loader:
            x, y = x.to(device), y.to(device)
            logits = model(x)
            probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
            val_preds.extend(probs)
            val_labels.extend(y.cpu().numpy())

    val_auroc = roc_auc_score(val_labels, val_preds)
    print(f"Validation slice-level AUROC: {val_auroc:.4f}", flush=True)

    # Fit temperature scaling on validation logits
    print("Fitting temperature scaling on validation set...", flush=True)
    val_logits = []
    with torch.no_grad():
        for x, y in val_loader:
            x, y = x.to(device), y.to(device)
            logits = model(x)
            val_logits.extend(logits.cpu().numpy())
    val_logits = np.array(val_logits)
    val_labels = np.array(val_labels)

    log_temperature = torch.zeros(1, requires_grad=True)
    optimizer_temp = torch.optim.LBFGS([log_temperature], lr=0.01, max_iter=50)

    def eval_crit():
        optimizer_temp.zero_grad()
        temp = torch.exp(log_temperature)
        scaled_logits = torch.tensor(val_logits, dtype=torch.float32) / temp
        loss = nn.CrossEntropyLoss()(scaled_logits, torch.tensor(val_labels, dtype=torch.long))
        loss.backward()
        return loss

    optimizer_temp.step(eval_crit)
    temperature = torch.exp(log_temperature).item()
    print(f"Optimal temperature T: {temperature:.4f}", flush=True)

    ckpt = {
        "model_state_dict": model.state_dict(),
        "temperature": temperature,
        "val_auroc": val_auroc,
    }
    ckpt_path = Path("validation/models/classifier_v2.pt")
    ckpt_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(ckpt, ckpt_path)
    print(f"Saved v2 checkpoint to {ckpt_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
