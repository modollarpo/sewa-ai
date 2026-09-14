// SEWA XAI — Azure Translator Service
// Free tier: 2M characters/month
// Provides UI i18n and clinical metadata translation per regional pod
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { createAxiosInstance } from '../utils/axiosInstance';

const axios = createAxiosInstance();

const TRANSLATOR_ENDPOINT = config.AZURE_TRANSLATOR_ENDPOINT;
const TRANSLATOR_KEY = config.AZURE_TRANSLATOR_KEY;

export interface AzureTranslateResult {
  detectedLanguage: string;
  text: string;
  translatedText: string;
  confidence: number;
}

export interface AzureDetectResult {
  language: string;
  score: number;
}

export interface AzureLanguageInfo {
  code: string;
  name: string;
  nativeName: string;
}

/**
 * Translate text using Azure Translator API (free tier: 2M chars/month).
 * Falls back gracefully if the key is not configured.
 */
export async function azureTranslateText(
  text: string,
  target: string,
  source?: string
): Promise<AzureTranslateResult | null> {
  if (!TRANSLATOR_KEY || !TRANSLATOR_ENDPOINT) {
    logger.warn('[AzureTranslator] Key or endpoint not configured — skipping translation.');
    return null;
  }

  try {
    const queryParams = source
      ? `api-version=3.0&from=${source}&to=${target}`
      : `api-version=3.0&to=${target}`;

    const resp = await axios.post(
      `${TRANSLATOR_ENDPOINT}/translate?${queryParams}`,
      [{ Text: text }],
      {
        headers: {
          'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const result = resp.data[0];
    return {
      detectedLanguage: result.detectedLanguage?.language ?? 'unknown',
      text: text,
      translatedText: result.translations[0]?.text ?? text,
      confidence: result.translations[0]?.confidence ?? 0,
    };
  } catch (err: any) {
    logger.error(`[AzureTranslator] Translation failed: ${err.message}`);
    return null;
  }
}

/**
 * Detect language using Azure Translator API.
 */
export async function azureDetectLanguage(text: string): Promise<AzureDetectResult | null> {
  if (!TRANSLATOR_KEY || !TRANSLATOR_ENDPOINT) {
    logger.warn('[AzureTranslator] Key or endpoint not configured — skipping detection.');
    return null;
  }

  try {
    const resp = await axios.post(
      `${TRANSLATOR_ENDPOINT}/detect?api-version=3.0`,
      [{ Text: text }],
      {
        headers: {
          'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const result = resp.data[0];
    return {
      language: result.language,
      score: result.score,
    };
  } catch (err: any) {
    logger.error(`[AzureTranslator] Language detection failed: ${err.message}`);
    return null;
  }
}

/**
 * List supported languages via Azure Translator API.
 */
export async function azureListLanguages(): Promise<AzureLanguageInfo[]> {
  if (!TRANSLATOR_KEY || !TRANSLATOR_ENDPOINT) {
    logger.warn('[AzureTranslator] Key or endpoint not configured — returning empty list.');
    return [];
  }

  try {
    const resp = await axios.get(
      `${TRANSLATOR_ENDPOINT}/languages?api-version=3.0&scope=translation`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
        },
        timeout: 10000,
      }
    );

    const translationLanguages = resp.data.translation;
    return Object.entries(translationLanguages).map(([code, info]: [string, any]) => ({
      code,
      name: info.name,
      nativeName: info.nativeName ?? code,
    }));
  } catch (err: any) {
    logger.error(`[AzureTranslator] List languages failed: ${err.message}`);
    return [];
  }
}

export const azureTranslatorService = { azureTranslateText, azureDetectLanguage, azureListLanguages };
