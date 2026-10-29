"""Update AGENTS.md work state section with multi-gate audit results."""
from pathlib import Path

agents_path = Path('AGENTS.md')
content = agents_path.read_text(encoding='utf-8')

# Find the existing Work State header for the public evidence harmonisation section
# and update the "Active Context" next steps entry

old_next_step = "### HIGHEST PRIORITY: Multi-Gate Safety Interception Audit (Item 5 of checklist)"
if old_next_step not in content:
    print("Section not found — adding new Work State block at top")
    # Insert after the first "## 📋 Work State" line
    marker = "## 📋 Work State (2026-10-29 — Public Evidence Pages Harmonisation"
    idx = content.find(marker)
    if idx == -1:
        print("ERROR: Could not find insertion point")
        exit(1)
    new_block = '''## 📋 Work State (2026-10-29 — Multi-Gate Safety Interception Audit, branch `main`)

Governing artifacts: `validation/scripts/audit_fn_safety_interception.py`, `validation/reports/v2a1_fn_safety_interception.json`, `docs/evidence/feasibility_report_fn_safety_interception.md`. Marking on every artifact: **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

### ✅ Completed
- **Multi-Gate Safety Interception Audit — Item 5 of Checklist (Commit `ae4ec47`)**:
  - Authored and executed `validation/scripts/audit_fn_safety_interception.py` on the 6 classifier-gate false-negative studies at λ = 0.0298.
  - Gate thresholds derived from 95th percentile of 49 confirmed-TN auto-cleared studies: τ_ood = 52.05 (Relative Mahalanobis OOD); τ_epi = 3.50×10⁻⁴ (MC-Dropout epistemic variance, N=30 passes).
  - **Per-study results:**
    - CQ500-CT-415 (score 0.0037): OOD = 55.54 > τ_ood → **ESCALATED by OOD gate**.
    - CQ500-CT-43 (score 0.0096): OOD = 64.31 > τ_ood → **ESCALATED by OOD gate**.
    - CQ500-CT-385 (score 0.0051): OOD = 32.43, Epi = 1.79×10⁻⁵ → NOT escalated.
    - CQ500-CT-278 (score 0.0012): OOD = 41.01, Epi = 1.32×10⁻⁶ → NOT escalated.
    - CQ500-CT-426 (score 0.0033): OOD = 46.58, Epi = 4.97×10⁻⁶ → NOT escalated.
    - CQ500-CT-196 (score 0.0012): OOD = 47.40, Epi = 8.29×10⁻⁷ → NOT escalated.
  - **Summary: 2/6 FN studies escalated by OOD gate; 4/6 not caught by any secondary gate.**
  - Classifier-gate FNR of 3.70% (6/162) unchanged — this is a SEPARATE retrospective analysis.
  - `docs/evidence/evidence_release_checklist.md` Item 5 updated from PENDING EXECUTION → EXECUTED.
  - All 8 checklist items now resolved (Items 1 & 8 require human action; Items 2–7 fully executed).

---

'''
    content = content[:idx] + new_block + content[idx:]
else:
    print("Found existing HIGHEST PRIORITY section — will update")
    # Replace the entire NEXT STEPS section
    next_steps_start = content.find("## 6. Next Steps (Priority Order)")
    if next_steps_start == -1:
        next_steps_start = content.find("### HIGHEST PRIORITY:")
    next_steps_end = content.find("## 7. Commitments", next_steps_start)
    if next_steps_end == -1:
        next_steps_end = content.find("\n---\n", next_steps_start)
    old_next = content[next_steps_start:next_steps_end]
    new_next = """## 6. Next Steps (Priority Order)

### ✅ COMPLETED: Multi-Gate Safety Interception Audit (Item 5 of checklist)

Results: 2/6 FN studies escalated by Relative Mahalanobis OOD gate; 4/6 not caught by any secondary gate.
Commit: `ae4ec47`. All 8 evidence-release checklist items now resolved.

### REMAINING ITEMS (require human action, no code action needed):

**Item 1 (Conditional-risk bound):** No code action. Human statistical reviewer needed. Current caveat text on public page is already correct.

**Patent review:** Transmit `docs/patent/UK_Patent_Application_2_With_Drawings.pdf` to patent attorney. No code action needed.

### CLEANUP:
- `scripts/update_checklist_item5.py` — temporary helper script, safe to delete after review.

"""
    content = content[:next_steps_start] + new_next + content[next_steps_end:]

agents_path.write_text(content, encoding='utf-8')
print("AGENTS.md updated. Length:", len(content))
