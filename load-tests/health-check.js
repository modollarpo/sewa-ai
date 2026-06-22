import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

const API_BASE_URL = __ENV.API_BASE_URL || 'https://api.sewaxai.health';

export default function () {
  const res = http.get(`${API_BASE_URL}/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response contains healthy status': (r) => r.json('status') === 'healthy',
  });
  sleep(1);
}
