// SEWA XAI — k6 Spike Test (sudden 500 VU burst simulating major incident)
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const API_URL = __ENV.API_URL || 'https://api.sewaxai.health';
const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '10s', target: 10  },
    { duration: '10s', target: 500 },   // spike
    { duration: '30s', target: 500 },   // sustained burst
    { duration: '10s', target: 0   },   // drop
  ],
  thresholds: {
    http_req_duration: ['p(99)<3000'],
    error_rate:        ['rate<0.05'],
  },
};

export function setup() {
  const res = http.post(`${API_URL}/api/v1/auth/login`,
    JSON.stringify({ email: __ENV.TEST_EMAIL, password: __ENV.TEST_PASS }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return { token: JSON.parse(res.body).token };
}

export default function(data) {
  const r = http.get(`${API_URL}/health`, { headers: { Authorization: `Bearer ${data.token}` } });
  errorRate.add(r.status !== 200);
  check(r, { 'alive': (r) => r.status === 200 });
}
