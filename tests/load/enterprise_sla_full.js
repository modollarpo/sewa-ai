// SEWA AI — Enterprise SLA Load Test (Full)
// Validates high-concurrency scan ingestion and triage triggering
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const API_URL = __ENV.API_URL || 'https://api.sewaxai.health';
const TEST_EMAIL = __ENV.TEST_EMAIL || '';
const TEST_PASS  = __ENV.TEST_PASS  || '';

export const options = {
  stages: [
    { duration: '1m', target: 200 },  // Ramp up
    { duration: '3m', target: 500 },  // Sustained load
    { duration: '1m', target: 1000 }, // Peak SLA target
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of scans ingested < 2s
    http_req_failed: ['rate<0.001'],   // 99.9% success rate required for medical data
  },
};

export function setup() {
  const res = http.post(`${API_URL}/api/v1/auth/login`, JSON.stringify({
    email: TEST_EMAIL, password: TEST_PASS, tenantSlug: 'royal-london',
  }), { headers: { 'Content-Type': 'application/json' } });
  
  check(res, { 'login success': (r) => r.status === 200 });
  const body = JSON.parse(res.body);
  return { token: body.accessToken };
}

export default function (data) {
  const payload = JSON.stringify({
    modality: 'CT',
    bodyPart: 'HEAD',
    storageUrl: 'https://sewa-dev-blobs.blob.core.windows.net/scans/test-load-scan.dcm',
    receivedAt: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
      'X-Load-Test': 'true',
    },
  };

  const res = http.post(`${API_URL}/api/v1/scans`, payload, params);
  
  check(res, {
    'ingestion 201': (r) => r.status === 201,
    'scan id received': (r) => {
        try {
            return JSON.parse(r.body).id !== undefined;
        } catch(e) { return false; }
    },
  });

  sleep(1);
}
