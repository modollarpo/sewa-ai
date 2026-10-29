"""Update evidence_release_checklist.md Item 5 with audit results."""
with open('docs/evidence/evidence_release_checklist.md', encoding='utf-8') as f:
    content = f.read()

idx = content.find('- **Action Required:** Author and run')
end_idx = content.find('\n\n---\n\n### Item 4:', idx)
old_chunk = content[idx:end_idx]
print("OLD CHUNK LENGTH:", len(old_chunk))

new_chunk = (
    "- **Multi-Gate Interception Audit — EXECUTED** "
    "(`validation/scripts/audit_fn_safety_interception.py`):\n"
    "  - Gate thresholds: tau_ood = 52.05 (95th pctl of 49 TN auto-cleared studies); "
    "tau_epi = 3.50e-4 (95th pctl of 49 TN auto-cleared studies).\n"
    "  - **CQ500-CT-415** (classifier score 0.0037): OOD score = 55.54 > tau_ood — "
    "**ESCALATED by OOD gate**.\n"
    "  - **CQ500-CT-43** (classifier score 0.0096): OOD score = 64.31 > tau_ood — "
    "**ESCALATED by OOD gate**.\n"
    "  - CQ500-CT-385 (score 0.0051): OOD = 32.43, Epi = 1.79e-5 — NOT escalated by any gate.\n"
    "  - CQ500-CT-278 (score 0.0012): OOD = 41.01, Epi = 1.32e-6 — NOT escalated by any gate.\n"
    "  - CQ500-CT-426 (score 0.0033): OOD = 46.58, Epi = 4.97e-6 — NOT escalated by any gate.\n"
    "  - CQ500-CT-196 (score 0.0012): OOD = 47.40, Epi = 8.29e-7 — NOT escalated by any gate.\n"
    "  - **Summary: 2/6 FN studies would have been escalated by the OOD gate; "
    "4/6 not caught by any secondary gate.**\n"
    "  - **Governance:** Separate retrospective analysis only. Classifier-gate FNR 3.70% (6/162) "
    "unchanged. No joint multi-gate FNR claim without independent pre-registered calibration.\n"
    "  - Outputs: `validation/reports/v2a1_fn_safety_interception.json` | "
    "`docs/evidence/feasibility_report_fn_safety_interception.md`"
)

content = content[:idx] + new_chunk + content[end_idx:]
with open('docs/evidence/evidence_release_checklist.md', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done. Written", len(content), "chars.")
