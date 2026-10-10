# Spec vs Code Decisions (GB2609706.3)
Date: 2026-10-10
Branch: fix/patent-aligned

## Status
Phase 0 started. Contract repair completed (live contract tests 20/20, CI green). g-v1 committed bf0cd3f8f4fe73a1b077d47ecb71b60f89325fe7 (2026-10-07 20:30:34 +0100), tagged g-v1.

## Known mismatches (preliminary)
1. Orchestrator field names aligned via wire contract; live tests enforce.
2. Uncertainty: MC dropout passes configurable; composite formula must match spec (note U<=~0.15).
3. Metacognition 9-layer gate present; H formula to be verified.
4. Clinician signature DB constraint - verify enforcement.
5. Hash-chained audit log - verify writers/readers.
6. OOD Mahalanobis, SHAP coherence, window-specific coherence - TBD.

## Resolution policy
- Keep formulas/thresholds unless approved; deviations logged.
- New features flagged off by default.
- Demo weights labeled; clinical mode refuses demo.
