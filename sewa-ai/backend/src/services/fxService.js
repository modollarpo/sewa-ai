"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRates = getRates;
exports.convertFromGBP = convertFromGBP;
exports.convertToGBP = convertToGBP;
// SEWA AI — backend/src/services/fxService.ts
// Live foreign exchange rates with Redis caching + hardcoded fallback.
// Refreshes every 4 hours from Open Exchange Rates (free tier) or ECB.
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
const axios_1 = __importDefault(require("axios"));
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
const CACHE_KEY = 'sewa:fx:rates';
const CACHE_TTL = 4 * 60 * 60; // 4 hours
// Hardcoded fallback — updated quarterly
const FALLBACK_RATES = {
    GBP: 1.000, EUR: 1.180, USD: 1.270,
    NGN: 1905.0, KES: 164.0, ZAR: 23.80,
    GHS: 17.40, INR: 106.0, CAD: 1.730,
    TZS: 3290.0, UGX: 4720.0, ETB: 145.0,
};
let _cache = { ...FALLBACK_RATES };
let _lastFetch = 0;
async function getRates() {
    // 1. Try Redis cache
    try {
        const cached = await redis_1.redisClient.get(CACHE_KEY);
        if (cached)
            return JSON.parse(cached);
    }
    catch { /* Redis unavailable — continue */ }
    // 2. Try live API (ECB free endpoint, no key needed)
    if (Date.now() - _lastFetch > CACHE_TTL * 1000) {
        try {
            const resp = await axios_1.default.get('https://api.frankfurter.app/latest?base=GBP', { timeout: 5000 });
            if (resp.data?.rates) {
                _cache = { GBP: 1, ...resp.data.rates };
                _lastFetch = Date.now();
                await redis_1.redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(_cache)).catch(() => { });
                logger_1.logger.info('[FX] Rates refreshed from Frankfurter API');
            }
        }
        catch (err) {
            logger_1.logger.warn(`[FX] Live rate fetch failed: ${err.message} — using cached/fallback`);
        }
    }
    return _cache;
}
async function convertFromGBP(gbpAmount, toCurrency) {
    const rates = await getRates();
    const rate = rates[toCurrency.toUpperCase()] ?? 1;
    return Math.round(gbpAmount * rate * 100) / 100;
}
async function convertToGBP(amount, fromCurrency) {
    const rates = await getRates();
    const rate = rates[fromCurrency.toUpperCase()] ?? 1;
    return Math.round((amount / rate) * 100) / 100;
}
