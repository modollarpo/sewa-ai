export const TRIAGE_REQ = {
  scan_id: { type: 'string', pattern: '^[A-Z0-9\\-_]{4,64}$' },
  storage_url: { optional: true },
  image_data: { optional: true },
  modality: { optional: true },
  patient_id: { optional: true },
  model_version: { optional: true }
} as const;

export const TRIAGE_RES = {
  scan_id: 'string',
  primary_finding: 'string',
  urgency: 'string',
  confidence: 'number',
  backend: 'string',
  demo_mode: 'boolean',
  model_version: 'string',
  recommendation: 'string',
  inference_ms: 'number'
} as const;
