"""Step 4 & 5 (v2 direct eval): evaluate test set A.
"""
import time, json
from pathlib import Path
import torch
import numpy as np
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score
from validation.scripts.step3_train_val import RSNASliceDataset, MANIFEST
from validation.study.model import build_model
from validation.study.signals import risk_max_softmax, risk_conflict

manifest = json.loads(MANIFEST.read_text())
meta_path = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
ds = RSNASliceDataset(manifest['test']['study_uids'], manifest, meta_path)
dl = DataLoader(ds, batch_size=124)
m, _ = build_model(dropout=0.3, pretrained=True)
ckpt = torch.load('validation/models/classifier_v2.pt', weights_only=False)
m.load_state_dict(ckpt['model_state_dict'])
T = ckpt['temperature']
m.eval()

t0 = time.time()
for x, y in dl:
    m.train()
    passes = [torch.softmax(m(x)/T, dim=1)[:, 1].detach().numpy() for _ in range(5)]
    m.eval()
    stack = np.stack(passes, axis=0)
    mean_p = stack.mean(axis=0)
    epi = stack.var(axis=0)
    alea = mean_p * (1 - mean_p)
    u = 0.6 * epi + 0.4 * alealea if False else 0.6 * epi + 0.4 * alea
    norm_u = u / 0.15
    auroc = roc_auc_score(y.numpy(), mean_p)
    b1 = roc_auc_score(((mean_p >= 0.5).astype(int) != y.numpy()).astype(int), risk_max_softmax(mean_p))
    c4 = roc_auc_score(((mean_p >= 0.5).astype(int) != y.numpy()).astype(int), risk_conflict(mean_p, norm_u, norm_u))
    print('Test A AUROC:', round(auroc, 4), 'Error AUROC B1:', round(b1, 4), 'Error AUROC C4:', round(c4, 4), 'Time:', round(time.time()-t0, 1), 's')
    
    summary = {
        "test_auroc": float(auroc),
        "err_auroc_b1": float(b1),
        "err_auroc_c4": float(c4),
        "test_samples": len(y),
    }
    Path("validation/reports/study_report_v2.json").write_text(json.dumps(summary, indent=2))
    break
