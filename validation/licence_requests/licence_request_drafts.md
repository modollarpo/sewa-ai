# Licence-request drafts (validation study)

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

These drafts are for the user to review, personalise and send. Steps 1-2 of the
validation prompt require stopping for approval before any download; written
permission is the cleanest route given both primary datasets are non-commercial.

## Who / what

| Dataset | Licence | Contact | Key question to ask |
| --- | --- | --- | --- |
| RSNA 2019 Brain CT Hemorrhage Challenge | Non-commercial (custom RSNA terms of use) | `informatics@rsna.org` or the dataset request flow at https://mira.rsna.org/dataset/1 | Written permission for company-internal research use (non-commercial feasibility study) |
| CQ500 (Qure.ai), 491 head CT | CC BY-NC-SA 4.0 | queries via the Qure.ai site / `shamislab` contact listed on the dataset page; official page http://headctstudy.qure.ai/dataset (currently unreachable from the study machine - DNS failure) | Confirm company-internal research use under NC, and share-alike implications for study outputs |

## Notes

- Nothing has been downloaded. `validation/data/` is empty and git-ignored.
- Official pages still to verify from the machine: CQ500 (DNS failed here - user to
  open http://headctstudy.qure.ai/dataset), PhysioNet BHX record, Hemorica official source.
- Do not distribute drafts; these are internal working documents.

---

# Draft 1 - RSNA (specific person)

Subject: Request for permission to use the RSNA 2019 Brain CT Hemorrhage dataset for a non-commercial feasibility study

Dear RSNA Informatics team,

I am writing to request permission to use the "Brain CT Hemorrhage Dataset" (RSNA 2019 Intracranial
Hemorrhage Challenge, https://www.kaggle.com/c/rsna-intracranial-hemorrhage-detection, also listed on
the Registry of Open Data on AWS) for a strictly non-commercial, internal research feasibility study.

WHAT WE ARE DOING (non-commercial):
- Task: binary classification of intracranial haemorrhage vs no haemorrhage in non-contrast head CT.
- Purpose: internal evaluation of an uncertainty-based safety gate for a medical AI product in
  development. No product sale, no services, no revenue from this work.
- Scope: a patient-level subset (a few thousand studies) sampled for feasibility; models are labelled
  "research only, not for commercial deployment".
- Output: an internal feasibility report. We will not publish figures/datasets without separate
  permission. We will not attempt to re-identify subjects.

SCHEDULE AND SCOPE: we expect the study to run in the next few months, using only the subset needed
for feasibility. We will keep all data on secure systems, will not redistribute, and will attribute per
your citation instructions (Flanders AF, et al. Radiology: Artificial Intelligence 2020;2:3).

COULD YOU PLEASE CONFIRM: (a) that this non-commercial company-internal research use is permitted;
(b) the correct access route (Kaggle competition download vs the controlled-access AWS bucket /
mira.rsna.org request); and (c) any conditions we must meet.

Thank you for your time.

Kind regards,
[Name], [Title], SEWA AI
[contact details]

---

# Draft 2 - RSNA (generic / no individual known)

Subject: Permission for non-commercial research use of the RSNA 2019 Brain CT Hemorrhage dataset

To the RSNA team (informatics@rsna.org / dataset request at https://mira.rsna.org/dataset/1),

We plan a strictly non-commercial internal feasibility study using the RSNA 2019 Brain CT Hemorrhage
dataset: binary ICH vs no-ICH on non-contrast head CT, using a patient-level subset, to evaluate an
uncertainty-based safety gate for an AI radiology tool in development.

We understand the dataset is released for non-commercial purposes including academic research and
education. Because we are a company (even though this study will produce no commercial output), we
wanted to check that our company-internal research use is acceptable, and how best to access the data
(Kaggle competition rules vs controlled-access AWS bucket / Mira).

We will not attempt to identify subjects; will not redistribute; and will cite the dataset as:
"Brain CT Hemorrhage Dataset, Copyright RSNA, 2019" (Flanders AF, et al. Radiology: Artificial
Intelligence 2020;2:3).

Could you please confirm permission and the access route, and note any conditions?

Thank you,
[Name], [Title], SEWA AI

---

# Draft 3 - CQ500 (Qure.ai)

Subject: Non-commercial research use of the CQ500 head CT dataset

Dear Qure.ai,

We would like to use the CQ500 head CT dataset (491 scans with three radiologist reads;
http://headctstudy.qure.ai/dataset) as an external test set in a strictly non-commercial internal
feasibility study: binary intracranial haemorrhage vs no haemorrhage on non-contrast head CT, to
evaluate an uncertainty-based safety gate for a medical imaging AI product in development.

We understand the dataset is shared under CC BY-NC-SA 4.0. Could you please confirm that:
(a) company-internal, non-commercial research evaluation is permitted under this licence; and
(b) you are happy for us to use CQ500 for this purpose, given we will not publish or redistribute it?

We will not attempt to re-identify subjects, will keep data on secure systems, and will not tune our
model on CQ500 (it is held out as an external test set). Study outputs will be internal; any future
publication or commercial release would be re-cleared first.

Thank you,
[Name], [Title], SEWA AI