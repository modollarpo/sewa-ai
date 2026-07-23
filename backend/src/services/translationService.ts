import { config } from '../config/env';
import { logger } from '../utils/logger';
import { createAxiosInstance } from '../utils/axiosInstance';

const TRANSLATION_URL = config.TRANSLATION_SERVICE_URL;

const axios = createAxiosInstance();

export interface TranslateResult {
  translatedText: string;
  source?: string;
  confidence?: number;
}

export interface DetectResult {
  language: string;
  confidence: number;
}

export interface LanguageInfo {
  code: string;
  name: string;
}

async function translateText(text: string, source: string, target: string): Promise<TranslateResult> {
  const resp = await axios.post(`${TRANSLATION_URL}/translate`, {
    q: text,
    source,
    target,
    api_key: 'free'
  }, { timeout: 30000 });
  return resp.data;
}

async function detectLanguage(text: string): Promise<DetectResult[]> {
  const resp = await axios.post(`${TRANSLATION_URL}/detect`, {
    q: text,
    api_key: 'free'
  }, { timeout: 10000 });
  return resp.data;
}

async function listLanguages(): Promise<LanguageInfo[]> {
  const resp = await axios.get(`${TRANSLATION_URL}/languages`, { timeout: 5000 });
  return resp.data;
}

export const translationService = { translateText, detectLanguage, listLanguages };
