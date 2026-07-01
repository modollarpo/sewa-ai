# SEWA XAI — edge/Dockerfile
# sewa-edge: Offline-first clinical AI inference container
# Runs fully air-gapped on a $300 mini-PC or Raspberry Pi 5 (x86/ARM64)
# Supports: CT, X-ray, MRI, ECG, Ultrasound | INT8 ONNX quantised
#
# Why this exists: Creates the ultimate competitive moat.
# Once a hospital runs sewa-edge, their scan history + audit logs live locally.
# Switching cost = 2-week IT project to re-point systems. Network effects compound.
#
# © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

# ── Stage 1: Build layer ──────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 libglib2.0-0 libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Lean production image (alpine-based for minimal attack surface) ──
FROM python:3.11-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    EDGE_MODE=offline \
    PORT=8080

# Runtime deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 libglib2.0-0 libsm6 libxext6 curl sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r sewaedge && useradd -r -g sewaedge -d /app sewaedge

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY --chown=sewaedge:sewaedge src/ ./src/

# Create required volume mount points
RUN mkdir -p /app/data/scans /app/data/reports /app/data/audit /app/models /app/logs \
    && chown -R sewaedge:sewaedge /app

USER sewaedge
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s \
  CMD curl -sf http://localhost:8080/health || exit 1

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
