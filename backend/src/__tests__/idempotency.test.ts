import { idempotent } from '../middleware/idempotency';
import { redisClient } from '../config/redis';

jest.mock('../config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    setex: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockRes = () => {
  const res: any = { statusCode: 200, json: jest.fn() };
  res.json = jest.fn((body: unknown) => { res._body = body; return res; });
  res.status = jest.fn((code: number) => { res.statusCode = code; return res; });
  return res;
};

describe('idempotent middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes through when no idempotency key', async () => {
    const req: any = { headers: {}, method: 'POST', path: '/sync' };
    const res = mockRes();
    const next = jest.fn();
    await idempotent(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns cached response on cache hit', async () => {
    (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify({ status: 200, body: { ok: true } }));
    const req: any = { headers: { 'x-idempotency-key': 'key-1' }, method: 'POST', path: '/sync' };
    const res = mockRes();
    const next = jest.fn();
    await idempotent(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('passes through on Redis failure', async () => {
    (redisClient.get as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
    const req: any = { headers: { 'x-idempotency-key': 'key-2' }, method: 'POST', path: '/sync' };
    const res = mockRes();
    const next = jest.fn();
    await idempotent(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('captures response on cache miss', async () => {
    (redisClient.get as jest.Mock).mockResolvedValue(null);
    (redisClient.setex as jest.Mock).mockResolvedValue('OK');
    const req: any = { headers: { 'x-idempotency-key': 'key-3' }, method: 'POST', path: '/sync' };
    const res = mockRes();
    const next = jest.fn();
    await idempotent(req, res, next);
    expect(next).toHaveBeenCalled();
    // Simulate handler calling res.json
    res.json({ scanId: 'abc' });
    expect(redisClient.setex).toHaveBeenCalledWith(
      expect.stringContaining('key-3'),
      86400,
      expect.any(String),
    );
  });
});
