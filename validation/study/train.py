"""Train the RSNA slice classifier (feasibility study).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

CPU-only (no GPU). Trains EfficientNet-B0 on the train split, selects on validation
AUROC, saves the best checkpoint + a per-epoch 'latest' checkpoint (resumable with
--resume). Deterministic where possible (seeds fixed). No data or weights are
committed (validation/models/ is gitignored).
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
    ap.add_argument("--resume", action="store_true")
    args = ap.parse_args()

    import torch
    import torch.nn as nn
    torch.set_num_threads(4)
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
    best_auroc, start_ep, history = -1.0, 1, []
    if args.resume and (MODELS / "latest.pt").exists():
        ck = torch.load(MODELS / "latest.pt", map_location="cpu", weights_only=False)
        model.load_state_dict(ck["model"])
        opt.load_state_dict(ck["opt"])
        best_auroc = ck.get("best_auroc", -1.0)
        start_ep = ck["epoch"] + 1
        history = ck.get("history", [])
        print(f"resumed from epoch {ck['epoch']} (best {best_auroc:.4f})", flush=True)

    for ep in range(start_ep, args.epochs + 1):
        model.train()
        perm = torch.randperm(len(xtr))
        t0, tot = time.time(), 0.0
        for b in range(0, len(xtr), args.batch):
            sel = perm[b:b + args.batch]
            opt.zero_grad()
            loss = lossf(model(xtr[sel]), ytr[sel])
            loss.backward()
            opt.step()
            tot += loss.item() * len(sel)
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
            torch.save({"state_dict": {k: v.clone() for k, v in model.state_dict().items()},
                        "meta": meta, "mean": mean.tolist(), "std": std.tolist(),
                        "val_auroc": float(auc), "args": vars(args)},
                       MODELS / "classifier.pt")
        torch.save({"model": model.state_dict(), "opt": opt.state_dict(),
                    "epoch": ep, "best_auroc": best_auroc, "history": history},
                   MODELS / "latest.pt")
        (MODELS / "train_history.json").write_text(json.dumps(history, indent=2))

    print(f"best val AUROC {best_auroc:.4f} -> {MODELS/'classifier.pt'}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
