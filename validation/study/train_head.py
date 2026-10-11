"""Train the dropout head on frozen EfficientNet-B0 features.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

CPU-feasible classifier for the feasibility study. Dropout lives in the head, which
is exactly where the MC-dropout uncertainty signal is drawn (prompt/config).
Saves validation/models/head.pt (gitignored).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

MODELS = Path("validation/models")
CACHE = Path("validation/data_cache/features_b0.npz")


class Head:
    pass


def build_head(d=1280, h=128, dropout=0.3):
    import torch.nn as nn
    return nn.Sequential(nn.Linear(d, h), nn.ReLU(), nn.Dropout(dropout), nn.Linear(h, 2))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=60)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--dropout", type=float, default=0.3)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    import torch
    import torch.nn as nn
    from sklearn.metrics import roc_auc_score

    from validation.study import data as datamod

    torch.manual_seed(args.seed)
    d = np.load(CACHE)
    feats = d["feats"]
    y = d["y"]
    sp = datamod.load_splits()
    ids = [str(s) for s in d["ids"]]
    spv = np.array([sp[i] for i in ids])

    ft = torch.from_numpy(feats)
    yt = torch.from_numpy(y).long()

    tr = torch.from_numpy(np.where(spv == "train")[0])
    va = torch.from_numpy(np.where(spv == "val")[0])

    head = build_head(feats.shape[1], 128, args.dropout)
    opt = torch.optim.AdamW(head.parameters(), lr=args.lr, weight_decay=1e-4)
    lossf = nn.CrossEntropyLoss()

    best_auc, best_state, history = -1.0, None, []
    for ep in range(1, args.epochs + 1):
        head.train()
        perm = tr[torch.randperm(len(tr))]
        for b in range(0, len(perm), 64):
            sel = perm[b:b + 64]
            opt.zero_grad()
            loss = lossf(head(ft[sel]), yt[sel])
            loss.backward()
            opt.step()
        head.eval()
        with torch.no_grad():
            pv = torch.softmax(head(ft[va]), dim=1)[:, 1].numpy()
        auc = roc_auc_score(yt[va].numpy(), pv)
        history.append(float(auc))
        if auc > best_auc:
            best_auc = auc
            best_state = {k: v.clone() for k, v in head.state_dict().items()}

    MODELS.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": best_state, "d": feats.shape[1], "h": 128,
                "dropout": args.dropout, "val_auroc": float(best_auc),
                "args": vars(args)}, MODELS / "head.pt")
    (MODELS / "head_history.json").write_text(json.dumps(history, indent=2))
    print(f"best val AUROC {best_auc:.4f} -> {MODELS/'head.pt'}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
