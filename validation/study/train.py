"""Train the RSNA slice classifier (feasibility study).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

CPU-only (no GPU). Trains EfficientNet-B0 on the train split, selects on validation
AUROC, saves the best checkpoint + run metadata. Deterministic where possible
(seeds fixed). No data or weights are committed (validation/models/ is gitignored).
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np

from validation.study import data as datamod
from validation.study.model import build_model

MODELS = Path("validation/models")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=15)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--dropout", type=float, default=0.3)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    import torch
    import torch.nn as nn
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    idx = datamod.split_indices()
    mean, std = datamod.channel_stats(idx["train"])
    xtr, ytr = datamod.tensors(idx["train"], mean, std)
    xva, yva = datamod.tensors(idx["val"], mean, std)
    print(f"train {tuple(xtr.shape)} val {tuple(xva.shape)} "
          f"pos(train)={int(ytr.sum())} pos(val)={int(yva.sum())}", flush=True)

    model, meta = build_model(args.dropout, pretrained=True)
    print(f"backbone meta: {meta}", flush=True)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    lossf = nn.CrossEntropyLoss()

    MODELS.mkdir(parents=True, exist_ok=True)
    best_auroc, best_state = -1.0, None
    history = []

    for ep in range(1, args.epochs + 1):
        model.train()
        perm = torch.randperm(len(xtr))
        t0, tot = time.time(), 0.0
        for b in range(0, len(xtr), args.batch):
            sel = perm[b:b + args.batch]
            opt.zero_grad()
            out = model(xtr[sel])
            loss = lossf(out, ytr[sel])
            loss.backward()
            opt.step()
            tot += loss.item() * len(sel)
        # validation AUROC on P(haemorrhage) -> select best epoch
        model.eval()
        with torch.no_grad():
            pv = torch.softmax(model(xva), dim=1)[:, 1].numpy()
        from sklearn.metrics import roc_auc_score
        auc = roc_auc_score(yva.numpy(), pv)
        history.append({"epoch": ep, "train_loss": tot / len(xtr), "val_auroc": float(auc)})
        print(f"epoch {ep}/{args.epochs}  loss {tot/len(xtr):.4f}  "
              f"val_AUROC {auc:.4f}  ({time.time()-t0:.0f}s)", flush=True)
        if auc > best_auroc:
            best_auroc = auc
            best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
            torch.save({"state_dict": best_state, "meta": meta,
                        "mean": mean.tolist(), "std": std.tolist(),
                        "val_auroc": float(auc), "args": vars(args)},
                       MODELS / "classifier.pt")

    (MODELS / "train_history.json").write_text(json.dumps(history, indent=2))
    print(f"best val AUROC {best_auroc:.4f} -> {MODELS/'classifier.pt'}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
