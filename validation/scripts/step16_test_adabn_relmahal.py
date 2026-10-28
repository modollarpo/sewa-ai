"""Test AdaBN and Relative Mahalanobis on CQ500.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
import copy
import sys
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import roc_auc_score

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "validation" / "scripts"))

import v2_study as VS
import v2_lib as L
from validation.study import signals as S

print("Loading model and caches...")
model, early, late, T = VS.load_model("validation/models/classifier_v2a1.pt")
train_feats, train_ids, train_studies, train_labels = VS.load_cache("train")
cq_feats, cq_ids, cq_studies, cq_labels = VS.load_cache("cq500")

print(f"Train feats: {train_feats.shape}, CQ feats: {cq_feats.shape}")

# 1. Baseline predictions
print("Computing baseline penultimate features and logits...")
pen_train, log_train = VS._penult_logits(model, late, train_feats)
pen_cq, log_cq = VS._penult_logits(model, late, cq_feats)

p_cq_raw = torch.softmax(log_cq, 1)[:, 1].numpy()
p_cq_T = L.apply_temperature(p_cq_raw, T)

study_list, study_prob_raw = L.aggregate_topk(cq_studies, p_cq_raw, p_cq_raw)
study_labels_dict = L.study_labels(cq_studies, cq_labels)
study_y = np.array([study_labels_dict[s] for s in study_list])

base_study_auc = roc_auc_score(study_y, study_prob_raw)
base_slice_auc = roc_auc_score(cq_labels, p_cq_raw)
print(f"Baseline CQ500 Slice AUROC: {base_slice_auc:.4f}, Study AUROC: {base_study_auc:.4f}")

# 2. Test AdaBN (Adaptive Batch Normalization)
print("\nTesting AdaBN (re-estimating BatchNorm running stats on CQ500)...")
late_adabn = copy.deepcopy(late)

# Put only BatchNorm layers in train mode to update running stats
for m in late_adabn.modules():
    if isinstance(m, (nn.BatchNorm2d, nn.BatchNorm1d)):
        m.train()
        m.momentum = 0.1

with torch.no_grad():
    for i in range(0, len(cq_feats), 128):
        batch = cq_feats[i:i+128]
        _ = late_adabn(batch)

late_adabn.eval()

pen_adabn, log_adabn = VS._penult_logits(model, late_adabn, cq_feats)
p_adabn_raw = torch.softmax(log_adabn, 1)[:, 1].numpy()
slice_auc_adabn = roc_auc_score(cq_labels, p_adabn_raw)

_, study_prob_adabn = L.aggregate_topk(cq_studies, p_adabn_raw, p_adabn_raw)
study_auc_adabn = roc_auc_score(study_y, study_prob_adabn)
print(f"AdaBN CQ500 Slice AUROC: {slice_auc_adabn:.4f}, Study AUROC: {study_auc_adabn:.4f}")

# 3. Test Relative Mahalanobis vs Standard Mahalanobis
print("\nTesting Relative Mahalanobis OOD Scoring...")
f_train = pen_train.numpy()
f_cq = pen_cq.numpy()

class RelativeMahalanobis:
    def __init__(self, shrinkage=0.05):
        self.shrinkage = shrinkage
        
    def fit(self, feats, y):
        feats = np.asarray(feats, float)
        y = np.asarray(y)
        d = feats.shape[1]
        
        self.means = {c: feats[y == c].mean(axis=0) for c in (0, 1)}
        self.mean_bg = feats.mean(axis=0)
        
        cov = np.zeros((d, d), dtype=float)
        for c in (0, 1):
            f = feats[y == c]
            fc = f - self.means[c]
            cov += fc.T @ fc
        cov /= max(len(feats) - 2, 1)
        cov = (1 - self.shrinkage) * cov + self.shrinkage * np.trace(cov) / d * np.eye(d)
        self.prec = np.linalg.pinv(cov)
        
        diff_bg = feats - self.mean_bg
        cov_bg = (diff_bg.T @ diff_bg) / max(len(feats) - 1, 1)
        cov_bg = (1 - self.shrinkage) * cov_bg + self.shrinkage * np.trace(cov_bg) / d * np.eye(d)
        self.prec_bg = np.linalg.pinv(cov_bg)
        return self

    def score(self, feats):
        feats = np.asarray(feats, float)
        dist_c = np.full(len(feats), np.inf)
        for c in (0, 1):
            diff = feats - self.means[c]
            m = np.sum((diff @ self.prec) * diff, axis=1)
            dist_c = np.minimum(dist_c, m)
            
        diff_bg = feats - self.mean_bg
        dist_bg = np.sum((diff_bg @ self.prec_bg) * diff_bg, axis=1)
        
        rel_dist = dist_c - dist_bg
        return np.sqrt(np.clip(dist_c, 0, None)), rel_dist

rm = RelativeMahalanobis().fit(f_train, train_labels)
dist_raw, dist_rel = rm.score(f_cq)

# Study-level aggregation of signals
_, study_raw_ood = L.aggregate_topk(cq_studies, p_cq_raw, dist_raw)
_, study_rel_ood = L.aggregate_topk(cq_studies, p_cq_raw, dist_rel)

# Classification errors at study level (using optimal study threshold ~0.35)
study_pred = (study_prob_raw > 0.35).astype(int)
study_err = (study_pred != study_y).astype(int)
print(f"CQ500 study errors (at threshold 0.35): {study_err.sum()}/{len(study_err)} ({study_err.mean():.1%})")

study_err_auc_raw = roc_auc_score(study_err, study_raw_ood)
study_err_auc_rel = roc_auc_score(study_err, study_rel_ood)
print(f"Study Error Detection AUROC (Standard Mahalanobis C2): {study_err_auc_raw:.4f}")
print(f"Study Error Detection AUROC (Relative Mahalanobis):     {study_err_auc_rel:.4f}")

# Also compare against baseline entropy B2
b2_slice = S.risk_entropy(p_cq_raw)
_, study_b2 = L.aggregate_topk(cq_studies, p_cq_raw, b2_slice)
study_err_auc_b2 = roc_auc_score(study_err, study_b2)
print(f"Study Error Detection AUROC (Baseline Entropy B2):     {study_err_auc_b2:.4f}")

print("\n--- Summary of Findings ---")
print(f"1. Baseline Study AUROC: {base_study_auc:.4f}")
print(f"2. AdaBN Study AUROC:    {study_auc_adabn:.4f} (Delta: {study_auc_adabn - base_study_auc:+.4f})")
print(f"3. Error Detection AUROC: Standard C2={study_err_auc_raw:.4f} vs Relative RMD={study_err_auc_rel:.4f} (Delta: {study_err_auc_rel - study_err_auc_raw:+.4f})")
