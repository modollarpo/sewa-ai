# Remediation Log (post-V5 audit correction)

## Version 5 issue
- Audit text had corrupted hash (0cd3f) and a bell control character before iOrchestrator (shell-escape damage).
- Document body was modified in-place (contradicting the instruction to restore 6 October wording and separate g-v1 into remediation log).

## Fixes applied
- Confirmed g-v1 commit: bf0cd3f8f4fe73a1b077d47ecb71b60f89325fe7 (2026-10-07 20:30:34 +0100)
- Tagged: g-v1 pushed to origin
- Fixed corrupted text (hash + control char) in SEWA_AI_CODEBASE_RESEARCH_IMPLEMENTATION_AUDIT.md
- Added top note recording g-v1 baseline (log-only, frozen thresholds/weights, evaluation harness, per-case logging, calibration logging, 33/33 tests)

## Contract repair status
- Wire contract + live contract tests (20/20) in CI; safety harnesses correct; orchestrator logs reliability (log-only); signal logger writes AIResult/CalibrationRecord/MetacognitionAuditLog. Recommend end-to-end orchestrator->real services smoke test (not mocked).

## Outstanding
- Derby co-design: treat g-v1 as baseline competing against pre-registered alternative
- N>=300 labelled cases required; harness returns insufficient_data < 30
- Investor deck binary requires manual edit
