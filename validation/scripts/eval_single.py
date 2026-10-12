import time, json
from pathlib import Path
import torch
import numpy as np
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score
from validation.scripts.step3_train_val import RSNASliceDataset, MANIFEST
from validation.study.model import build_model
from validation.study.signals import risk_max_softmax, risk_conflict

print("import ok", flush=True)
manifest = json.loads(MANIFEST.read_text())
meta_path = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
ds = RSNASliceDataset(manifest['test']['study_uids'], manifest, meta_path)
print("ds len:", len(ds), flush=True)
dl = DataLoader(ds, batch_size=16)

m, _ = build_model(dropout=0.3, pretrained=True)
ckpt = torch.load('validation/models/classifier_v2.pt', weights_only=False)
m.load_state_dict(ckpt['model_state_dict'])
T = ckpt['temperature']
m.eval()
print("model loaded", flush=True)

all_preds = []
all_labels = []
t0=time.time()
for x, y in dl:
    with torch.no_grad():
        logits = m(x) / T
        probs = torch.softmax(logits, dim=1)[:, 1].numpy()
        all_preds.extend(probs)
        all_labels.extend(y.numpy())
print("single pass eval done in", round(time.time()-t0, 1), "s. AUROC:", round(roc_auc_score(all_labels, all_preds), 4))
