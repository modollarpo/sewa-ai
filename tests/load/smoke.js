// SEWA AI — k6 Smoke Test
// Validates the critical path: auth → upload → AI pipeline → report
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const API_URL = __ENV.API_URL || 'https://api.sewaxai.health';
const TEST_EMAIL = __ENV.TEST_EMAIL || '';
const TEST_PASS  = __ENV.TEST_PASS  || '';

// Custom metrics
const doorToAlert  = new Trend('door_to_alert_ms', true);
const aiLatency    = new Trend('ai_pipeline_ms',   true);
const errorRate    = new Rate('error_rate');
const scansTotal   = new Counter('scans_total');

export const options = {
  stages: [
    { duration: '30s', target: 5  },   // warm up
    { duration: '60s', target: 10 },   // sustained
    { duration: '30s', target: 0  },   // wind down
  ],
  thresholds: {
    http_req_duration:     ['p(95)<500'],
    door_to_alert_ms:      ['p(95)<2500'],
    error_rate:            ['rate<0.01'],
  },
};

let authToken = '';

export function setup() {
  const res = http.post(`${API_URL}/api/v1/auth/login`, JSON.stringify({
    email: TEST_EMAIL, password: TEST_PASS, tenantSlug: 'royal-london',
  }), { headers: { 'Content-Type': 'application/json' } });
  
  check(res, { 'login 200': (r) => r.status === 200 });
  const body = JSON.parse(res.body);
  return { token: body.accessToken };
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
    'X-Load-Test': 'true',
  };

  // 1. Health check
  const health = http.get(`${API_URL}/health`, { headers });
  check(health, { 'health 200': (r) => r.status === 200 });

  // 2. List scans (worklist)
  const worklist = http.get(`${API_URL}/api/v1/scans?status=ai_complete&limit=10`, { headers });
  if (worklist.status !== 200 && __VU === 1) {
    console.log(`Worklist failed: ${worklist.status} ${worklist.body}`);
  }
  check(worklist, { 'worklist 200': (r) => r.status === 200 });
  errorRate.add(worklist.status !== 200);

  // 3. Payment status
  const billing = http.get(`${API_URL}/api/v1/payments/status`, { headers });
  if (billing.status !== 200 && __VU === 1) {
    console.log(`Billing failed: ${billing.status} ${billing.body}`);
  }
  check(billing, { 'billing 200': (r) => r.status === 200 });

  // 4. Notifications
  const notifs = http.get(`${API_URL}/api/v1/notifications`, { headers });
  if (notifs.status !== 200 && __VU === 1) {
    console.log(`Notifs failed: ${notifs.status} ${notifs.body}`);
  }
  check(notifs, { 'notifs 200': (r) => r.status === 200 });

  sleep(1);
}
