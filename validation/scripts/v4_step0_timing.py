"""v4 Step 0: timing smoke test (CPU-only budget check).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Measures cores/RAM and the per-scan classifier cost (tile load + early + late + MC
head) to project the v4 test-set runtime. Generator (LLM) timing is a separate
Step-3 test; this only budgets the classifier side.
"""
from __future__ import annotations

import multiprocessing
import time

import numpy as np
import torch

from validation.scripts import v2_lib as L
from validation.scripts import v2_study as VS

T0 = time.perf_counter


def best_of(fn, n=5):
    best = 1e9
    for _ in range(n):
        t = T0()
        fn()
        best = min(best, T0() - t)
    return best


if __name__ == "__main__":
    try:
        import psutil
        vm = psutil.virtual_memory()
        print(f"ram_gb: {vm.total/1e9:.1f}  avail_gb: {vm.available/1e9:.1f}")
    except Exception:  # noqa: BLE001
        print("ram: psutil unavailable")
    print(f"cpu_count: {multiprocessing.cpu_count()}")
    torch.set_num_threads(2)

    t = T0()
    model, early, late, T = VS.load_model("validation/models/classifier_v2a1.pt")
    print(f"load_model: {T0()-t:.2f}s  temperature={T:.4f}")

    feats_cache, ids, studies, labels = VS.load_cache("test")
    scan0 = ids[:8]  # one study's 8 selected slices

    t = T0()
    ood = VS.fit_ood(model, late, "train")
    print(f"fit_ood (train cache): {T0()-t:.2f}s")

    def load_clean():
        return torch.stack([L.load_tile160(i) for i in scan0])

    def load_corrupt():
        return torch.stack([L.corrupt(L.load_tile160(i), "noise", 2) for i in scan0])

    x_clean = load_clean()
    t_load = best_of(load_clean)
    t_loadc = best_of(load_corrupt)
    t_early = best_of(lambda: L.early_features(early, x_clean))

    f = L.early_features(early, x_clean)
    t_late = best_of(lambda: VS.slice_signals(model, late, f, T, ood))
    print(f"per-scan (8 tiles): load={t_load*1000:.0f}ms  early={t_early*1000:.0f}ms  "
          f"late+MC={t_late*1000:.0f}ms  total={ (t_load+t_early+t_late)*1000:.0f}ms")
    print(f"per-scan corrupted load: {t_loadc*1000:.0f}ms")

    per_condition = t_load + t_early + t_late
    for N in (120, 300):
        mins = 10 * N * per_condition / 60  # clean + 9 corruptions
        print(f"projected classifier time, {N} scans x 10 conditions: ~{mins:.1f} min")
