"""Step 0 (v2): smoke-test timings on real tiles to size the reduced-scope protocol.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

No GPU. Measures per-slice wall time for the operations that dominate v2:
  * full-net forward (backbone+head)            @224 and @160
  - backbone-only feature extraction            @224 and 160
  - head-only MC dropout (20 passes on cached features)  <- supposed to be cheap
  - full-net training step (fwd+bwd)            @224 and 160
  - head-only training step on cached features
  - one Grad-CAM backward pass

Prints incrementally (survives interruption) and writes
validation/reports/v2_smoke_timings.json.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from validation.study.model import build_model

THREADS = 2
OUT = Path("validation/reports/v2_smoke_timings.json")
TILES = Path("validation/data_cache/tiles")

RESULTS = {}
LOG = Path("C:/Users/USER/AppData/Local/Temp/opencode/v2_smoke.log")


def log(msg):
    print(msg, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def timed(fn, iters=3):
    import time as _t
    fn()  # warmup
    t0 = _t.time()
    for _ in range(iters):
        fn()
    return (_t.time() - t0) / iters


def main():
    import torch
    torch.set_num_threads(2)
    log(f"threads={torch.get_num_threads()} cpus={len(__import__('os').sched_getaffinity(0)) if hasattr(__import__('os'),'sched_getaffinity') else 'n/a'}")

    model, meta = build_model(dropout=0.3, pretrained=False)
    model.eval()

    # load a few real tiles
    from pathlib import Path as P
    files = sorted(P("validation/data_cache/tiles").glob("*.npy"))[:16]
    arrs = [np.load(f) for f in files]
    import torch.nn.functional as F

    def batch(n, size):
        xs = []
        for a in arrs[:n]:
            t = torch.from_numpy(a).permute(2, 0, 1).float().unsqueeze(0) / 255.0
            if size != 224:
                t = F.interpolate(t, size=(size, size), mode="bilinear", align_corners=False)
            xs.append(t[0])
        return torch.stack(xs)

    def full_fwd(size, n=8):
        x = batch(n, size)
        with torch.no_grad():
            out = model(x)
        return out.shape[0]

    def feats_only_n(size, n=8):
        x = batch(n, size)
        with torch.no_grad():
            f = model.avgpool(model.features(x))
            f = torch.flatten(f, 1)
        return f.shape[0]

    for size in (224, 160):
        s = timed(lambda sz=size: full_fwd(sz), iters=3)
        log(f"full forward {size}px: {s/8*1000:.0f} ms/slice")
        R = f"full_fwd_{size}"; RESULTS[R] = s / 8
        s = timed(lambda sz=size: feats_only_n(sz), iters=3)
        log(f"backbone features {size}px: {s/8*1000:.0f} ms/slice")
        RESULTS[f"feats_{size}"] = s / 8

    # head MC on cached features
    with torch.no_grad():
        _f = model.avgpool(model.features(batch(16, 160)))
        feat = torch.flatten(_f, 1)
    def head_mc20():
        for _ in range(20):
            with torch.no_grad():
                _ = model.classifier(feat)[:, 1]
    s = timed(head_mc20, iters=3)
    log(f"head 20x MC on 16 cached feats: {s*1000:.1f} ms total ({s/20/16*1e6:.0f} us/feat-pass)")
    RESULTS["head_mc20_16feat_total"] = s

    # training steps
    for size in (224, 160):
        x = batch(8, size)
        y = torch.zeros(8, dtype=torch.long)
        opt = torch.optim.AdamW(model.parameters(), lr=1e-4)
        def step(sz=size, xx=x, yy=y, opt=opt):
            model.train()
            opt.zero_grad()
            loss = torch.nn.CrossEntropyLoss()(model(xx), yy.long())
            loss.backward()
            opt.step()
        s = timed(step, iters=2)
        log(f"train step (full net) {size}px: {s/8*1000:.0f} ms/slice")
        RESULTS[f"train_step_full_{size}"] = s / 8
        model.eval()

    # head-only train on cached feats
    head = torch.nn.Sequential(torch.nn.Dropout(0.3), torch.nn.Linear(1280, 2))
    opt = torch.optim.AdamW(head.parameters(), lr=1e-3)
    yy = torch.zeros(16).long()
    def head_train(xx=feat, yy=yy, opt=opt):
        head.train()
        opt.zero_grad()
        loss = torch.nn.CrossEntropyLoss()(head(xx), yy)
        loss.backward()
        opt.step()
    s = timed(head_train, iters=5)
    log(f"train step (head-only on cached feats) 16: {s/16*1000:.0f} ms/slice")
    RESULTS["train_step_head_16"] = s / 16

    # grad-cam backward on one slice
    x1 = batch(1, 224)
    def gradcam():
        model.eval()
        xr = x1.clone().requires_grad_(True)
        f = model.features(xr)
        f.retain_grad()
        out = model.classifier(torch.flatten(model.avgpool(f), 1))[:, 1]
        out.sum().backward()
    s = timed(gradcam, iters=3)
    log(f"grad-cam backward 224 (1 slice): {s*1000:.0f} ms")
    RESULTS["gradcam_224_1slice"] = s

    RESULTS["_meta"] = {"threads": 2, "torch": torch.__version__}
    P("validation/reports").mkdir(parents=True, exist_ok=True)
    P("validation/reports/step0_smoke_timings.json").write_text(
        json.dumps(RESULTS, indent=2))
    log("wrote validation/reports/step0_smoke_timings.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
