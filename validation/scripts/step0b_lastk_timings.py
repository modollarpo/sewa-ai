"""Step 0b (v2): cost of training only the last-K blocks + head (frozen early layers).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch

torch.set_num_threads(2)
from validation.study.model import build_model

LOG = Path("C:/Users/USER/AppData/Local/Temp/opencode/v2_smoke.log")


def log(msg):
    print(msg, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def timed(fn, iters=2):
    import time
    fn()
    t0 = time.time()
    for _ in range(iters):
        fn()
    return (time.time() - t0) / iters


def main():
    arrs = [np.load(f) for f in sorted(Path("validation/data_cache/tiles").glob("*.npy"))[:8]]

    def batch(n=8, size=160):
        xs = []
        for a in arrs[:n]:
            t = torch.from_numpy(a).permute(2, 0, 1).float().unsqueeze(0) / 255.0
            if size != 224:
                t = torch.nn.functional.interpolate(t, size=(size, size),
                                                    mode="bilinear", align_corners=False)
            xs.append(t[0])
        return torch.stack(xs)

    out = json.loads(Path("validation/reports/step0_smoke_timings.json").read_text())
    for K in (2, 3, 4):
        m, _ = build_model(dropout=0.3, pretrained=False)
        for p in m.parameters():
            p.requires_grad = False
        nblocks = len(m.features)
        for i in range(nblocks - K, nblocks):
            for p in m.features[i].parameters():
                p.requires_grad = True
        for p in m.classifier.parameters():
            p.requires_grad = True
        params = [p for p in m.parameters() if p.requires_grad]
        opt = torch.optim.AdamW(params, lr=1e-3)
        xx, yy = batch(8, 160), torch.zeros(8).long()

        def step(m=m, xx=xx, yy=yy, opt=opt):
            m.train()
            opt.zero_grad()
            torch.nn.CrossEntropyLoss()(m(xx), yy).backward()
            opt.step()

        s = timed(step, iters=2)
        nparam = sum(p.numel() for p in params) / 1e6
        log(f"train last {K} blocks+head 160px: {s/8*1000:.0f} ms/slice (trainable={nparam:.2f}M)")
        out[f"train_lastk{K}_160"] = s / 8

        early = torch.nn.Sequential(*[m.features[i] for i in range(nblocks - K)])

        def cache_fn(E=early, xx=xx):
            with torch.no_grad():
                return E(xx)

        sc = timed(cache_fn, iters=2)
        log(f"  cache early forward (blocks 0..{nblocks - K - 1}) 160px: {sc/8*1000:.0f} ms/slice")
        out[f"cacheearly_K{K}_160"] = sc / 8

    Path("validation/reports/step0_smoke_timings.json").write_text(json.dumps(out, indent=2))
    log("updated validation/reports/step0_smoke_timings.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
