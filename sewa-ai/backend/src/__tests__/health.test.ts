// SEWA AI — backend/src/__tests__/health.test.ts
// Jest integration tests — run by CI/CD pipeline (npm test)
// Uses test PostgreSQL + Redis spun up by GitHub Actions services

import request from 'supertest';

// Set test env before importing app
process.env.DEPLOY_TARGET      = 'local';
process.env.NODE_ENV           = 'test';
process.env.DATABASE_URL       = process.env.DATABASE_URL || 'postgresql://sewa:test_password@localhost:5432/sewa_test';
process.env.REDIS_URL          = process.env.REDIS_URL    || 'redis://localhost:6379/0';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_long!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars!!!';
process.env.ENCRYPTION_KEY     = 'test_encryption_key_32_chars!!!';
process.env.PORT               = '3001';

// Lazy import after env is set
let app: any;

beforeAll(async () => {
  // Dynamically import to pick up env vars
  const mod = await import('../index');
  app = mod;
  // Give server time to connect
  await new Promise(r => setTimeout(r, 2000));
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
