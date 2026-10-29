path = r'C:\sewa_extract\docs\patent\UK_Patent_Application_2_Specification_and_Claims.md'
with open(path, 'r', encoding='utf-8') as f:
    s = f.read()
start = s.find('### 7.7')
end = s.find('## 8. CLAIMS')
ns = '''### 7.7 Technical Synergy and Functional Coupling Across Pipeline Stages
The technical elements of the present invention may be co-designed in a particular arrangement to provide cross-layer operational stability. In such an arrangement, upstream modules precondition the feature representations and data domains ingested by downstream statistical and governance mechanisms:

1. *Feature Standardization in Relation to Conformal Risk Control*:
Split Conformal Risk Control provides a basis for bounding expected conditional False Negative Rate under the assumption that calibration and inference instances are exchangeable. In heterogeneous multi-scanner clinical workflows, hardware differences can introduce channel-wise activation shifts. Rather than modifying convolutional filter weights, the platform may apply Zero-Label AdaBN to adapt running normalisation statistics on an unlabelled target stream to mitigate covariate-induced distribution drift prior to threshold evaluation by the conformal prediction gate.

2. *Latent Manifold Considerations for Relative Mahalanobis Distance (RMD) Gating*:
The Relative Mahalanobis Distance metric evaluates penultimate feature representations relative to an unconditioned background centroid. Acquisition hardware differences may introduce non-pathological shifts; executing AdaBN in upstream convolutional layers may regularize the latent space prior to covariance estimation, helping to isolate pathological anomalies from hardware-induced variation.

3. *Attribution Artifact Suppression for Metacognitive Verification*:
Anatomically-Masked HiResCAM removes high-attenuation calvarial bone gradient artifacts via an intracranial parenchymal mask before spatial attribution maps are ingested by the metacognition safety engine, reducing the risk of cranial hyperdensities triggering spurious plausibility escalations.

4. *Complementary Failure-Mode Partitioning*:
The integrated architecture is intended to provide defense-in-depth: conformal risk control addresses in-distribution calibration risk under exchangeability, RMD addresses certain latent representation shifts, epistemic uncertainty addresses aspects of physical sensor degradation, and database-level constraints address clinical release governance. Retrospective audit data showing that secondary gates intercepted 2 of 6 observed false negatives indicates the gates are complementary rather than comprehensive; accordingly, mandatory human review remains required.

'''
with open(path, 'w', encoding='utf-8') as f:
    f.write(s[:start] + ns + '\n' + s[end:])
print('done')
