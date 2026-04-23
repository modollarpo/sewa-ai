// SEWA AI — k6 Soak Test (30 min sustained)
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const API_URL = __ENV.API_URL || 'https://api.sewaxai.health';
const doorToAlert = new Trend('door_to_alert_ms', true);
const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '5m',  target: 50  },
    { duration: '20m', target: 50  },
    { duration: '5m',  target: 0   },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    door_to_alert_ms:  ['p(95)<2500'],
    error_rate:        ['rate<0.005'],
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
  const headers = { Authorization: `Bearer ${data.token}` };
  const r = http.get(`${API_URL}/api/v1/scans?limit=5`, { headers });
  errorRate.add(r.status !== 200);
  check(r, { '200': (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);
}
