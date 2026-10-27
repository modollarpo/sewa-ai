"""Step 4 & 5 (v2 report writer): generate v2 report and metrics.
"""
import json
from pathlib import Path
import numpy as np
import torch
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score
from validation.scripts.step3_train_val import RSNASliceDataset, MANIFEST
from validation.study.model import build_model
from validation.study.signals import risk_max_softmax, risk_entropy, normalized_U, risk_conflict

manifest = json.loads(MANIFEST.read_text())
meta_path = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
ds = RSNASliceDataset(manifest['test']['study_uids'], meta_path.parent / meta_path.name, meta_path)
dl = DataLoader(ds, batch_size=32)

m, _ = build_model(dropout=0.3, pretrained=True)
ckpt = torch.load('validation/models/classifier_v2.pt', weights_only=False)
m.load_state_dict(ckpt['model_state_dict'])
T = ckpt['temperature']
m.eval()

all_probs, all_labels = [], []
for x, y in dl:
    with torch.no_grad():
        logits = m(x) / T
        probs = torch.softmax(logits, dim=1)[:, 1].numpy()
        all_probs.extend(probs)
        all_labels.extend(y.numpy())

all_probs = np.array(all_probs)
all_labels = np.array(all_labels)

test_auroc = roc_auc_score(all_labels, all_probs)
b1_risk = risk_max_softmax(all_probs)
b2_risk = risk_entropy(all_probs)

preds = (all_probs >= 0.5).astype(int)
is_error = (preds != all_labels).astype(int)

err_auroc_b1 = roc_auc_score(is_error, b1_risk)
err_auroc_b2 = roc_auc_score(is_error, b2_risk)

print("Test A (clean) slice AUROC:", round(test_auroc, 4))
print("Error AUROC B1 (max-softmax):", round(err_auroc_b1, 4))
print("Error AUROC B2 (entropy):", round(err_auroc_b2, 4))

summary = {
    "test_auroc": float(test_auroc),
    "err_auroc_b1": float(err_auroc_b1),
    "err_auroc_b2": float(err_auroc_b2),
    "test_samples": len(all_labels),
    "test_error_rate": float(is_error.mean()),
}
Path("validation/reports/study_report_v2.json").write_text(json.dumps(summary, indent=2))
print("Wrote validation/reports/study_report_v2.json")
