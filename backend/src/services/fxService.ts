// SEWA XAI — backend/src/services/fxService.ts
// Live foreign exchange rates with Redis caching + hardcoded fallback.
// Refreshes every 4 hours from Open Exchange Rates (free tier) or ECB.
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import axios from 'axios';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

const CACHE_KEY = 'sewa:fx:rates';
const CACHE_TTL = 4 * 60 * 60; // 4 hours

// Hardcoded fallback — updated quarterly
const FALLBACK_RATES: Record<string, number> = {
  GBP: 1.000, EUR: 1.180, USD: 1.270,
  NGN: 1905.0, KES: 164.0, ZAR: 23.80,
  GHS: 17.40, INR: 106.0, CAD: 1.730,
  TZS: 3290.0, UGX: 4720.0, ETB: 145.0,
};

let _cache: Record<string, number> = { ...FALLBACK_RATES };
let _lastFetch = 0;

export async function getRates(): Promise<Record<string, number>> {
  // 1. Try Redis cache
  try {
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* Redis unavailable — continue */ }

  // 2. Try live API (ExchangeRate-API open endpoint, supports 161 global currencies)
  if (Date.now() - _lastFetch > CACHE_TTL * 1000) {
    try {
      const resp = await axios.get(
        'https://open.er-api.com/v6/latest/GBP',
        { timeout: 5000 }
      );
      if (resp.data?.rates) {
        _cache = { GBP: 1, ...resp.data.rates };
        _lastFetch = Date.now();
        await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(_cache)).catch(() => {});
        logger.info('[FX] Rates refreshed from ExchangeRate-API');
      }
    } catch (err: any) {
      logger.warn(`[FX] Live rate fetch failed: ${err.message} — using cached/fallback`);
    }
  }

  return _cache;
}

export async function convertFromGBP(gbpAmount: number, toCurrency: string): Promise<number> {
  const rates = await getRates();
  const rate = rates[toCurrency.toUpperCase()] ?? 1;
  return Math.round(gbpAmount * rate * 100) / 100;
}

export async function convertToGBP(amount: number, fromCurrency: string): Promise<number> {
  const rates = await getRates();
  const rate = rates[fromCurrency.toUpperCase()] ?? 1;
  return Math.round((amount / rate) * 100) / 100;
}
