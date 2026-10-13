"""Step 3 (v2 amendment 1): train late blocks + head on cached early features.

Frozen: EfficientNet-B0 pretrained backbone, first (len-3) feature blocks cached.
Trained: last 3 feature blocks + dropout/linear head. <=8 epochs, early stop on
validation study-level AUROC. Temperature fit on validation study-level scores.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import roc_auc_score

from validation.study.model import build_model
from validation.scripts import v2_lib as L

CACHE = Path(os.environ.get("SEWA_CACHE_DIR", "validation/data_cache"))
CKPT = Path(os.environ.get("SEWA_CKPT", "validation/models/classifier_v2a1.pt"))
MAX_EPOCHS = 8
PATIENCE = 3
BATCH = 32
LR_HEAD = 1e-3
LR_LATE = 1e-4


def load_cache(split: str):
    z = np.load(CACHE / f"v2_early_{split}.npz", allow_pickle=False)
    return torch.from_numpy(z["feats"]), z["ids"], z["studies"], z["labels"].astype(int)


def forward(model, late, early_out: torch.Tensor):
    f = late(early_out)
    penult = torch.flatten(model.avgpool(f), 1)
    return penult, model.classifier(penult)


@torch.no_grad()
def slice_probs(model, late, feats):
    model.eval()
    out = []
    for i in range(0, feats.shape[0], 256):
        _, logits = forward(model, late, feats[i:i + 256])
        out.append(torch.softmax(logits, dim=1)[:, 1].cpu().numpy())
    return np.concatenate(out)


def study_auc(studies, probs, labels):
    sl, sv = L.aggregate_topk(studies, probs, probs)
    lab = L.study_labels(studies, labels)
    y = np.array([lab[s] for s in sl])
    return float(roc_auc_score(y, sv)), sl, sv, y


def main() -> int:
    torch.set_num_threads(2)
    tr_f, tr_ids, tr_s, tr_y = load_cache("train")
    va_f, va_ids, va_s, va_y = load_cache("val")
    print(f"train {tr_f.shape} val {va_f.shape}", flush=True)

    model, meta = build_model(dropout=0.3, pretrained=True)
    print("pretrained:", meta, flush=True)
    early, late = L.split_model(model)
    for p in early.parameters():
        p.requires_grad_(False)
    early.eval()

    params = [p for p in late.parameters() if p.requires_grad] + \
             [p for p in model.classifier.parameters() if p.requires_grad]
    opt = torch.optim.AdamW([
        {"params": [p for p in late.parameters() if p.requires_grad], "lr": LR_LATE},
        {"params": [p for p in model.classifier.parameters() if p.requires_grad], "lr": LR_HEAD},
    ], weight_decay=1e-4)
    lossf = nn.CrossEntropyLoss()

    best = {"auc": -1.0, "epoch": -1}
    best_state = None
    rng = np.random.default_rng(L.SEED)
    for epoch in range(1, MAX_EPOCHS + 1):
        late.train()
        model.classifier.train()
        perm = rng.permutation(tr_f.shape[0])
        tot, nb = 0.0, 0
        for i in range(0, len(perm), BATCH):
            idx = torch.from_numpy(perm[i:i + BATCH])
            _, logits = forward(model, late, tr_f[idx])
            loss = lossf(logits, torch.from_numpy(tr_y[idx]))
            opt.zero_grad()
            loss.backward()
            opt.step()
            tot += float(loss)
            nb += 1
        vp = slice_probs(model, late, va_f)
        auc, _, _, _ = study_auc(va_s, vp, va_y)
        print(f"epoch {epoch}: train_loss={tot/max(nb,1):.4f} val_study_auc={auc:.4f}", flush=True)
        if auc > best["auc"]:
            best = {"auc": auc, "epoch": epoch}
            best_state = {"late": {k: v.detach().clone() for k, v in late.state_dict().items()},
                          "clf": {k: v.detach().clone() for k, v in model.classifier.state_dict().items()}}
        elif epoch - best["epoch"] >= PATIENCE:
            print("early stop", flush=True)
            break

    late.load_state_dict(best_state["late"])
    model.classifier.load_state_dict(best_state["clf"])
    vp = slice_probs(model, late, va_f)
    auc, vs, vv, vy = study_auc(va_s, vp, va_y)
    T = L.fit_temperature(vv, vy)
    print(f"BEST val_study_auc={auc:.4f} (epoch {best['epoch']})  T={T:.4f}", flush=True)

    CKPT.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"late": best_state["late"], "clf": best_state["clf"], "temperature": T,
                "val_study_auc": auc, "epoch": best["epoch"], "k_late": L.K_LATE,
                "size": L.SIZE, "seed": L.SEED}, CKPT)
    (CACHE / "v2a1_train_summary.json").write_text(json.dumps(
        {"val_study_auc": auc, "temperature": T, "best_epoch": best["epoch"],
         "meta": meta, "marking": "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."},
        indent=2), encoding="utf-8")
    print("saved", CKPT, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
