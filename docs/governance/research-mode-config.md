# SEWA AI — Research Mode Configuration

## Overview

Toggles SEWA AI between **Clinical Mode** (production SaMD operation, consultant-only access, full audit trail) and **Research Mode** (study operation, additional data capture, blinding controls, monitoring dashboards).

## Configuration

Set in `backend/src/config/env.ts`:

```typescript
RESEARCH_MODE_ENABLED: z.boolean().default(false),
STUDY_ID: z.string().optional(),           // e.g. "IRAS-372596"
BLIND_RADIOLOGIST: z.boolean().default(true),  // Hide AI output during study read
DATA_CAPTURE_INTERVAL: z.number().default(30),  // minutes between dashboard sync
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/research/status` | Current study status, enrolment count |
| POST | `/api/v1/research/blinding` | Toggle radiologist blinding |
| GET | `/api/v1/research/dashboard` | Study performance dashboard |

## Behaviour Changes

When `RESEARCH_MODE_ENABLED=true`:

1. All AI outputs include additional metadata fields (`modelVersion`, `inferenceTime`, `confidenceInterval`)
2. Radiologist workspace enters blinding mode (AI flags hidden until radiologist submits their read)
3. Additional audit events logged to Confidential Ledger (`studyRead`, `blindingToggle`, `dataExport`)
4. Performance dashboard populates with site-level aggregate metrics
5. Data retention switches to study-defined schedule (90 days vs 7 year default)
6. Export endpoints enabled for study data extraction (pseudonymised)
