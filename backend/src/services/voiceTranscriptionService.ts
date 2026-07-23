import { config } from '../config/env';
import { logger } from '../utils/logger';
import { createAxiosInstance } from '../utils/axiosInstance';

const VOICE_URL = config.VOICE_TRANSCRIPTION_SERVICE_URL;

const axios = createAxiosInstance();

export interface TranscriptionRequest {
  audio_data: string;
  scan_id: string;
  tenant_id: string;
  language?: string;
  audio_format?: string;
}

export interface TranscriptionResult {
  transcription: string;
  confidence: number;
  language: string;
  processing_time_ms: number;
  model_used: string;
  fallback_used: boolean;
  clinical_terms?: Array<{
    term: string;
    category: string;
    confidence: number;
    medical_code?: string;
  }>;
  warnings?: string[];
}

async function transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResult> {
  const resp = await axios.post(`${VOICE_URL}/transcribe`, {
    audio_data: request.audio_data,
    scan_id: request.scan_id,
    tenant_id: request.tenant_id,
    language: request.language || 'en',
    audio_format: request.audio_format || 'webm'
  }, { timeout: 60000 });
  return resp.data;
}

async function healthCheck(): Promise<{ status: string; service: string; version: string }> {
  const resp = await axios.get(`${VOICE_URL}/health`, { timeout: 5000 });
  return resp.data;
}

export const voiceTranscriptionService = { transcribeAudio, healthCheck };
