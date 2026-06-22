import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 VUs
    { duration: '5m', target: 100 },  // Stay at 100 VUs
    { duration: '2m', target: 200 },  // Ramp up to 200 VUs
    { duration: '5m', target: 200 },  // Stay at 200 VUs
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests should complete in <2s
    errors: ['rate<0.05'],             // Less than 5% error rate
  },
};

// Test data
const API_BASE_URL = __ENV.API_BASE_URL || 'https://api.sewaxai.health';
const TEST_SCAN_PAYLOAD = JSON.stringify({
  modality: 'CT',
  bodyPart: 'HEAD',
  priority: 'STAT',
});

export default function () {
  // Step 1: Authenticate (get JWT token)
  const authRes = http.post(`${API_BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'test@sewa.local',
    password: 'TestPass123!',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!check(authRes, {
    'login status is 200': (r) => r.status === 200,
  })) {
    errorRate.add(1);
    return;
  }

  const authToken = authRes.json('token');

  // Step 2: Submit a scan for processing
  const scanRes = http.post(`${API_BASE_URL}/api/v1/scans`, TEST_SCAN_PAYLOAD, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  check(scanRes, {
    'scan submission status is 201': (r) => r.status === 201,
  }) || errorRate.add(1);

  sleep(1);
}
