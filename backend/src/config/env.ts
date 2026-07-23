// SEWA XAI — backend/src/config/env.ts
// ─────────────────────────────────────────────────────────────────
// Single source of truth for all environment configuration.
//
// DEPLOY_TARGET=local   → expects local docker-compose values
// DEPLOY_TARGET=azure   → expects Azure-managed service endpoints
//
// To switch between deployments: change DEPLOY_TARGET in .env
// (or run scripts/generate-env-azure.sh to auto-build .env.azure)
// ─────────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
import path   from 'path';
import { logger } from '../utils/logger';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ── Deploy target detection ───────────────────────────────────
export type DeployTarget = 'local' | 'azure';
const DEPLOY_TARGET = (process.env.DEPLOY_TARGET ?? 'local') as DeployTarget;
const IS_AZURE = DEPLOY_TARGET === 'azure';
const IS_LOCAL = !IS_AZURE;

// ── Validation helpers ─────────────────────────────────────────
function required(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `[env] Missing required variable: ${key}\n` +
      `  Deploy target: ${DEPLOY_TARGET}\n` +
      `  Ensure ${IS_AZURE ? 'backend/.env.azure' : 'backend/.env.local'} is copied to backend/.env`
    );
  }
  return val;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

// ── Core config ────────────────────────────────────────────────
export const config = {

  // ── Meta ─────────────────────────────────────────────────────
  DEPLOY_TARGET,
  IS_AZURE,
  IS_LOCAL,

  // ── Server ───────────────────────────────────────────────────
  NODE_ENV:     optional('NODE_ENV', 'development'),
  PORT:         optionalInt('PORT', 5000),
  REGION:       optional('REGION', 'uk'),
  APP_URL:      optional('APP_URL', 'http://localhost:5000'),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:3000'),
  CORS_ORIGINS: (optional('CORS_ORIGINS', 'http://localhost:3000')).split(',').map(s => s.trim()),
  LOG_LEVEL:    optional('LOG_LEVEL', 'info'),

  // ── Database ─────────────────────────────────────────────────
  DATABASE_URL: required('DATABASE_URL'),
  ...(IS_AZURE && {
    AZURE_PG_HOST: optional('AZURE_PG_HOST'),
  }),

  // ── Redis ────────────────────────────────────────────────────
  REDIS_URL: required('REDIS_URL'),
  ...(IS_AZURE && {
    AZURE_REDIS_HOST: optional('AZURE_REDIS_HOST'),
    AZURE_REDIS_PORT: optionalInt('AZURE_REDIS_PORT', 6380),
  }),

  // ── Security ─────────────────────────────────────────────────
  JWT_SECRET:           required('JWT_SECRET'),
  JWT_REFRESH_SECRET:   required('JWT_REFRESH_SECRET'),
  ENCRYPTION_KEY:       required('ENCRYPTION_KEY'),

  // ── AI Services ──────────────────────────────────────────────
  // Local: http://localhost:8000 … 8005
  // Azure: http://ai-triage:8000 … (AKS internal DNS)
  AI_SERVICE_URL:            optional('AI_SERVICE_URL',            optional('TRIAGE_URL',         IS_AZURE ? 'http://sewa-triage:8000'        : 'http://localhost:8000')),
  VLM_SERVICE_URL:           optional('VLM_SERVICE_URL',           optional('VLM_URL',            IS_AZURE ? 'http://sewa-vlm-report:8001'   : 'http://localhost:8001')),
  UNCERTAINTY_SERVICE_URL:   optional('UNCERTAINTY_SERVICE_URL',   optional('UNCERTAINTY_URL',    IS_AZURE ? 'http://sewa-uncertainty:8009'  : 'http://localhost:8009')),
  METACOGNITION_SERVICE_URL: optional('METACOGNITION_SERVICE_URL', optional('METACOGNITION_URL', IS_AZURE ? 'http://sewa-metacognition:8003' : 'http://localhost:8003')),
  FL_SERVICE_URL:            optional('FL_SERVICE_URL',            IS_AZURE ? 'http://sewa-federated:8004' : 'http://localhost:8004'),
  CL_SERVICE_URL:            optional('CL_SERVICE_URL',            IS_AZURE ? 'http://sewa-continuous:8005' : 'http://localhost:8005'),
  PATHOLOGY_SERVICE_URL:     optional('PATHOLOGY_SERVICE_URL',     IS_AZURE ? 'http://sewa-pathology:8002'          : 'http://localhost:8002'),
  MAMMOGRAPHY_SERVICE_URL:   optional('MAMMOGRAPHY_SERVICE_URL',   IS_AZURE ? 'http://sewa-mammography:8007'        : 'http://localhost:8007'),
  RETINAL_SERVICE_URL:       optional('RETINAL_SERVICE_URL',       IS_AZURE ? 'http://sewa-retinal:8008'            : 'http://localhost:8008'),

  // ── FHIR R4 ──────────────────────────────────────────────────
  FHIR_BASE_URL:      optional('FHIR_BASE_URL'),
  FHIR_TENANT_ID:     optional('FHIR_TENANT_ID'),
  FHIR_CLIENT_ID:     optional('FHIR_CLIENT_ID'),
  FHIR_CLIENT_SECRET: optional('FHIR_CLIENT_SECRET'),
  FHIR_VALIDATOR_URL: optional('FHIR_VALIDATOR_URL', IS_LOCAL ? 'http://fhir-validator:8080' : ''),
  // ── NHS Terminology Service ──────────────────────────────────
  NHS_TERMINOLOGY_URL: optional('NHS_TERMINOLOGY_URL', 'https://termcodes.nhs.uk/api'),
  NHS_TERMINOLOGY_API_KEY: optional('NHS_TERMINOLOGY_API_KEY', ''),
  // ── NHS PDS (Patient Demographic Service) ─────────────────
  NHS_PDS_URL: optional('NHS_PDS_URL', 'https://sandbox.api.service.nhs.uk/personal-demographics/FHIR/R4'),
  NHS_PDS_API_KEY: optional('NHS_PDS_API_KEY', ''),

  // ── HL7v2 ────────────────────────────────────────────────────
  HL7_HOST:     optional('HL7_HOST', 'localhost'),
  HL7_PORT:     optionalInt('HL7_PORT', 2575),
  HL7_FACILITY: optional('HL7_FACILITY', 'SEWA_AI'),

  // ── PACS / DICOM ─────────────────────────────────────────────
  PACS_HOST:     optional('PACS_HOST', 'localhost'),
  PACS_PORT:     optionalInt('PACS_PORT', 104),
  PACS_AE_TITLE: optional('PACS_AE_TITLE', 'SEWA_PACS'),

  // ── Storage ───────────────────────────────────────────────────
  // Both local (Azurite emulator) and Azure use the same connection string key.
  // Local:  UseDevelopmentStorage=true
  // Azure:  DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...
  AZURE_STORAGE_CONNECTION_STRING: optional('AZURE_STORAGE_CONNECTION_STRING', 'UseDevelopmentStorage=true'),
  AZURE_STORAGE_CONTAINER:         optional('AZURE_STORAGE_CONTAINER',  'scans'),
  AZURE_GRADCAM_CONTAINER:         optional('AZURE_GRADCAM_CONTAINER',  'gradcam'),
  AZURE_REPORTS_CONTAINER:         optional('AZURE_REPORTS_CONTAINER',  'reports'),
  AZURE_STORAGE_ACCOUNT:           optional('AZURE_STORAGE_ACCOUNT'),

  // ── Azure-specific ────────────────────────────────────────────
  AZURE_SUBSCRIPTION_ID:                optional('AZURE_SUBSCRIPTION_ID'),
  AZURE_TENANT_ID:                      optional('AZURE_TENANT_ID'),
  AZURE_RESOURCE_GROUP:                 optional('AZURE_RESOURCE_GROUP'),
  AZURE_KEY_VAULT_URI:                  optional('AZURE_KEY_VAULT_URI'),
  AZURE_KEY_VAULT_NAME:                 optional('AZURE_KEY_VAULT_NAME'),
  AZURE_SERVICEBUS_CONNECTION_STRING:   optional('AZURE_SERVICEBUS_CONNECTION_STRING'),
  AZURE_SERVICEBUS_TRIAGE_QUEUE:        optional('AZURE_SERVICEBUS_TRIAGE_QUEUE', 'sewa-scan-triage'),
  AZURE_SERVICEBUS_HL7_QUEUE:           optional('AZURE_SERVICEBUS_HL7_QUEUE',    'sewa-hl7-messages'),
  AZURE_SIGNALR_CONNECTION_STRING:      optional('AZURE_SIGNALR_CONNECTION_STRING'),
  AZURE_LOG_ANALYTICS_WORKSPACE_ID:     optional('AZURE_LOG_ANALYTICS_WORKSPACE_ID'),
  AZURE_CONFIDENTIAL_LEDGER_URL:        optional('AZURE_CONFIDENTIAL_LEDGER_URL'),
  AKS_CLUSTER_NAME:                     optional('AKS_CLUSTER_NAME'),
  ACR_LOGIN_SERVER:                     optional('ACR_LOGIN_SERVER'),

  // ── Payments ──────────────────────────────────────────────────
  STRIPE_SECRET_KEY:        optional('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET:    optional('STRIPE_WEBHOOK_SECRET'),
  STRIPE_PUBLISHABLE_KEY:   optional('STRIPE_PUBLISHABLE_KEY'),
  PAYSTACK_SECRET_KEY:      optional('PAYSTACK_SECRET_KEY'),
  PAYSTACK_PUBLIC_KEY:      optional('PAYSTACK_PUBLIC_KEY'),
  FLUTTERWAVE_SECRET_KEY:   optional('FLUTTERWAVE_SECRET_KEY'),
  FLUTTERWAVE_PUBLIC_KEY:   optional('FLUTTERWAVE_PUBLIC_KEY'),
  FLUTTERWAVE_SECRET_HASH:  optional('FLUTTERWAVE_SECRET_HASH'),  // verif-hash for webhook verification
  MPESA_CONSUMER_KEY:       optional('MPESA_CONSUMER_KEY'),
  MPESA_CONSUMER_SECRET:    optional('MPESA_CONSUMER_SECRET'),
  MPESA_SHORTCODE:          optional('MPESA_SHORTCODE'),
  MPESA_PASSKEY:            optional('MPESA_PASSKEY'),

  // ── CRM & Support ─────────────────────────────────────────────
  HUBSPOT_ACCESS_TOKEN:     optional('HUBSPOT_ACCESS_TOKEN'),
  SUPPORT_SLACK_WEBHOOK:    optional('SUPPORT_SLACK_WEBHOOK'),
  ZENDESK_SUBDOMAIN:        optional('ZENDESK_SUBDOMAIN'),
  ZENDESK_EMAIL:            optional('ZENDESK_EMAIL'),
  ZENDESK_API_TOKEN:        optional('ZENDESK_API_TOKEN'),

  // ── Firebase / FCM ────────────────────────────────────────────
  FIREBASE_PROJECT_ID:   optional('FIREBASE_PROJECT_ID'),
  FIREBASE_PRIVATE_KEY:  optional('FIREBASE_PRIVATE_KEY'),
  FIREBASE_CLIENT_EMAIL: optional('FIREBASE_CLIENT_EMAIL'),

  // ── Azure Communication Services (ACS) ──────────────────────
  AZURE_COMMUNICATION_CONNECTION_STRING: optional('AZURE_COMMUNICATION_CONNECTION_STRING'),
  AZURE_COMMUNICATION_SMS_NUMBER:        optional('AZURE_COMMUNICATION_SMS_NUMBER'),
  AZURE_COMMUNICATION_WHATSAPP_CHANNEL_ID: optional('AZURE_COMMUNICATION_WHATSAPP_CHANNEL_ID'),
  EMAIL_FROM: optional('EMAIL_FROM', 'info@sewaxai.health'),
  SENDGRID_API_KEY: optional('SENDGRID_API_KEY'),

  // ── Multi-cloud Storage ───────────────────────────────────────
  STORAGE_PROVIDER: optional('STORAGE_PROVIDER', 'azure'), // azure | aws | gcp | multi
  // AWS S3
  AWS_REGION:            optional('AWS_REGION', 'us-east-1'),
  AWS_ACCESS_KEY_ID:     optional('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: optional('AWS_SECRET_ACCESS_KEY'),
  AWS_S3_BUCKET_SCANS:   optional('AWS_S3_BUCKET_SCANS',   'sewa-ai-scans-us'),
  AWS_S3_BUCKET_REPORTS: optional('AWS_S3_BUCKET_REPORTS', 'sewa-ai-reports-us'),
  AWS_S3_BUCKET_GRADCAM: optional('AWS_S3_BUCKET_GRADCAM', 'sewa-ai-gradcam-us'),
  // GCP Cloud Storage
  GCP_PROJECT_ID:           optional('GCP_PROJECT_ID'),
  GCP_KEY_FILE:             optional('GCP_KEY_FILE'),              // path to SA JSON
  GCP_KEY_JSON:             optional('GCP_KEY_JSON'),              // SA JSON as string (for containers)
  GCP_BUCKET_SCANS:         optional('GCP_BUCKET_SCANS',   'sewa-ai-scans-eu'),
  GCP_BUCKET_REPORTS:       optional('GCP_BUCKET_REPORTS', 'sewa-ai-reports-eu'),
  GCP_BUCKET_GRADCAM:       optional('GCP_BUCKET_GRADCAM', 'sewa-ai-gradcam-eu'),

  // ── Appointment / Telehealth ──────────────────────────────────
  VIDEO_PROVIDER:    optional('VIDEO_PROVIDER', 'daily'),   // daily | twilio | jitsi
  DAILY_API_KEY:     optional('DAILY_API_KEY'),
  DAILY_DOMAIN:      optional('DAILY_DOMAIN'),

  // ── Monitoring ─────────────────────────────────────────────
  // Azure Application Insights — free, workspace-based, linked to sewa-ai-production-law
  // Provisioned: 2026-06-30 | Resource: sewa-ai-production-appinsights (uksouth)
  APPLICATIONINSIGHTS_CONNECTION_STRING: optional('APPLICATIONINSIGHTS_CONNECTION_STRING', optional('AZURE_APPINSIGHTS_CONNECTION_STRING')),
  SENTRY_DSN: optional('SENTRY_DSN'), // retained as secondary fallback

  // ── External AI / LLM (Azure OpenAI) ──────────────────────────
  AZURE_OPENAI_API_KEY: optional('AZURE_OPENAI_API_KEY'),
  AZURE_OPENAI_ENDPOINT: optional('AZURE_OPENAI_ENDPOINT'),
  AZURE_OPENAI_DEPLOYMENT_NAME: optional('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-54-mini'),
  AZURE_OPENAI_WHISPER_DEPLOYMENT: optional('AZURE_OPENAI_WHISPER_DEPLOYMENT', 'whisper'),
  // ── Enterprise AI Services (deployed on AKS) ────────────────
  TRANSLATION_SERVICE_URL:     optional('TRANSLATION_SERVICE_URL',     IS_AZURE ? 'http://translation.sewa-ai:8080'       : 'http://localhost:8080'),
  VOICE_TRANSCRIPTION_SERVICE_URL: optional('VOICE_TRANSCRIPTION_SERVICE_URL', IS_AZURE ? 'http://voice-transcription.sewa-ai:8000' : 'http://localhost:8000'),

  // ── Azure AI Speech (real-time transcription, F0 free tier) ──
  AZURE_SPEECH_KEY: optional('AZURE_SPEECH_KEY'),
  AZURE_SPEECH_REGION: optional('AZURE_SPEECH_REGION', 'uksouth'),

} as const;

// ── Startup log ───────────────────────────────────────────────
logger.info(
  `[SEWA] Config loaded | target=${DEPLOY_TARGET} | env=${config.NODE_ENV} | region=${config.REGION} | port=${config.PORT}`
);

if (IS_AZURE) {
  logger.info(`[SEWA] Azure | rg=${config.AZURE_RESOURCE_GROUP} | kv=${config.AZURE_KEY_VAULT_NAME}`);
}

export default config;