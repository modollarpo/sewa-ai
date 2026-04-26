import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 200 }, // ramp up to 200 users
    { duration: '3m', target: 500 }, // stay at 500 users
    { duration: '1m', target: 1000 }, // push to 1000 users (SLA test)
    { duration: '2m', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.01'],    // less than 1% failure rate
  },
};

const BASE_URL = __ENV.API_URL || 'https://api.sewaxai.health/api/v1';

export default function () {
  const payload = JSON.stringify({
    modality: 'CT',
    bodyPart: 'HEAD',
    storageUrl: 'https://sewa-dev-blobs.blob.core.windows.net/scans/test-load-scan.dcm',
    receivedAt: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TEST_TOKEN}`,
    },
  };

  const res = http.post(`${BASE_URL}/scans`, payload, params);
  
  check(res, {
    'status is 201': (r) => r.status === 201,
    'scan id returned': (r) => JSON.parse(r.body).id !== undefined,
  });

  sleep(1);
}
