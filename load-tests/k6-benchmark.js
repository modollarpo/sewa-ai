import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 200 }, // ramp up to 200 users
    { duration: '1m', target: 1000 }, // stress at 1000 users
    { duration: '30s', target: 0 },   // scale down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // 1. Health check simulation
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });
  
  // Simulate thinking time
  sleep(1);

  // 2. Auth ping
  const authRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'admin@sewaxai.health',
    password: 'wrong_password_just_load_testing'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // We expect 401 or 400 since we're using wrong creds, 
  // but the API gateway should handle the load gracefully without 5xx
  check(authRes, {
    'auth login responds without crashing': (r) => r.status === 401 || r.status === 400 || r.status === 200,
  });
  
  sleep(1);
}
