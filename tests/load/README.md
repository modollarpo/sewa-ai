# SEWA XAI — k6 Load Tests

Tests the full AI pipeline under clinical load conditions.

## Setup
```bash
brew install k6   # macOS
apt-get install k6  # Ubuntu
```

## Run
```bash
# Smoke test (2 VUs, 1 min)
k6 run tests/load/smoke.js

# Soak test (50 VUs, 30 min) — validates sustained throughput
k6 run tests/load/soak.js

# Spike test (sudden 500 VU burst)
k6 run tests/load/spike.js

# With custom API URL
API_URL=https://api.sewaxai.health k6 run tests/load/smoke.js
```

## SLA Targets
| Metric | Target |
|--------|--------|
| P95 door-to-alert | < 2,500ms |
| P99 API response | < 500ms |
| Error rate | < 0.1% |
| Concurrent scans | 1,000 |

© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
