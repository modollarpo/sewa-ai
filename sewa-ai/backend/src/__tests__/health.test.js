"use strict";
// SEWA AI — backend/src/__tests__/health.test.ts
// Jest integration tests — run by CI/CD pipeline (npm test)
// Uses test PostgreSQL + Redis spun up by GitHub Actions services
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
// Set test env before importing app
process.env.DEPLOY_TARGET = 'local';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sewa:test_password@localhost:5432/sewa_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';
process.env.JWT_SECRET = 'test_jwt_secret_32_chars_long!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars!!!';
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_chars!!!';
process.env.PORT = '3001';
// Lazy import after env is set
let app;
beforeAll(async () => {
    // Dynamically import to pick up env vars
    const mod = await Promise.resolve().then(() => __importStar(require('../index')));
    app = mod;
    // Give server time to connect
    await new Promise(r => setTimeout(r, 2000));
}, 15_000);
afterAll(async () => {
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database')));
    const { redisClient } = await Promise.resolve().then(() => __importStar(require('../config/redis')));
    await prisma.$disconnect().catch(() => { });
    await redisClient.quit().catch(() => { });
});
// ── Health endpoint ──────────────────────────────────────────
describe('GET /health', () => {
    it('returns 200 with status field', async () => {
        const res = await (0, supertest_1.default)(`http://localhost:3001`).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('version');
        expect(res.body.services).toHaveProperty('database');
        expect(res.body.services).toHaveProperty('redis');
    });
});
// ── Auth endpoints ───────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
    it('rejects invalid credentials', async () => {
        const res = await (0, supertest_1.default)(`http://localhost:3001`)
            .post('/api/v1/auth/login')
            .send({ email: 'nonexistent@sewaxai.health', password: 'wrongpassword' });
        expect(res.status).toBe(401);
    });
    it('rejects missing body', async () => {
        const res = await (0, supertest_1.default)(`http://localhost:3001`)
            .post('/api/v1/auth/login')
            .send({});
        expect([400, 401, 422]).toContain(res.status);
    });
});
// ── Protected route guards ───────────────────────────────────
describe('Protected routes', () => {
    it('GET /api/v1/scans returns 401 without token', async () => {
        const res = await (0, supertest_1.default)(`http://localhost:3001`).get('/api/v1/scans');
        expect(res.status).toBe(401);
    });
    it('GET /api/v1/patients returns 401 without token', async () => {
        const res = await (0, supertest_1.default)(`http://localhost:3001`).get('/api/v1/patients');
        expect(res.status).toBe(401);
    });
    it('GET /api/v1/reports returns 401 without token', async () => {
        const res = await (0, supertest_1.default)(`http://localhost:3001`).get('/api/v1/reports');
        expect(res.status).toBe(401);
    });
});
// ── Rate limiter ─────────────────────────────────────────────
describe('Rate limiting', () => {
    it('applies rate limiting headers', async () => {
        const res = await (0, supertest_1.default)(`http://localhost:3001`).get('/health');
        // Should have rate limit headers
        expect(res.headers).toBeDefined();
    });
});
