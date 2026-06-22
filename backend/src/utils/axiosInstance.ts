import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { logger } from './logger';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

function isRetryable(err: AxiosError): boolean {
  if (!err.config) return false;
  if (err.response) {
    return [408, 429, 500, 502, 503, 504].includes(err.response.status);
  }
  return true;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createAxiosInstance(baseURL?: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    config.metadata = config.metadata || { retries: 0 };
    return config;
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (err: AxiosError) => {
      const config = err.config as InternalAxiosRequestConfig & { metadata: { retries: number } };
      if (!config) return Promise.reject(err);

      config.metadata = config.metadata || { retries: 0 };

      if (isRetryable(err) && config.metadata.retries < MAX_RETRIES) {
        config.metadata.retries += 1;
        logger.warn(`[Axios] Retrying request (attempt ${config.metadata.retries}/${MAX_RETRIES}): ${err.config?.url}`);
        await sleep(RETRY_DELAY * config.metadata.retries);
        return instance(config);
      }

      logger.error(`[Axios] Request failed: ${err.config?.url} — ${err.message}`);
      return Promise.reject(err);
    }
  );

  return instance;
}
