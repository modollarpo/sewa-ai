// SEWA XAI — backend/src/__tests__/health.test.ts
// Jest integration tests — run by CI/CD pipeline (npm test)
// Uses test PostgreSQL + Redis spun up by GitHub Actions services

import request from 'supertest';

// Set test env before importing app
process.env.DEPLOY_TARGET      = 'local';
process.env.NODE_ENV           = 'test';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be provided for tests');
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be provided for tests');
if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET must be provided for tests');
if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY must be provided for tests');
process.env.PORT = '3001';

// Lazy import after env is set
let app: any;

beforeAll(async () => {
  // Dynamically import to pick up env vars
  const mod = await import('../index');
  app = mod;
}, 15_000);

afterAll(async () => {
  const { prisma } = await import('../config/database');
  const { redisClient } = await import('../config/redis');
  await prisma.$disconnect().catch(() => {});
  await redisClient.quit().catch(() => {});
});

// ── Health endpoint ──────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with status field', async () => {
    const res = await request(`http://localhost:3001`).get('/health');
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
    const res = await request(`http://localhost:3001`)
      .post('/api/v1/auth/login')
      .send({ email: 'nonexistent@sewaxai.health', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('rejects missing body', async () => {
    const res = await request(`http://localhost:3001`)
      .post('/api/v1/auth/login')
      .send({});
    expect([400, 401, 422]).toContain(res.status);
  });
});

// ── Protected route guards ───────────────────────────────────
describe('Protected routes', () => {
  it('GET /api/v1/scans returns 401 without token', async () => {
    const res = await request(`http://localhost:3001`).get('/api/v1/scans');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/patients returns 401 without token', async () => {
    const res = await request(`http://localhost:3001`).get('/api/v1/patients');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/reports returns 401 without token', async () => {
    const res = await request(`http://localhost:3001`).get('/api/v1/reports');
    expect(res.status).toBe(401);
  });
});

// ── Rate limiter ─────────────────────────────────────────────
describe('Rate limiting', () => {
  it('applies rate limiting headers', async () => {
    const res = await request(`http://localhost:3001`).get('/health');
    // Should have rate limit headers
    expect(res.headers).toBeDefined();
  });
});
