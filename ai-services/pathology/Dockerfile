# SEWA XAI — ai-services/pathology/Dockerfile
# Digital Pathology AI Service — CPU-Only, Multi-Stage Build
#
# Stage 1: Builder — installs all Python deps
# Stage 2: Runtime — lean image with only runtime artifacts
#
# Deploy target: Azure AKS Standard_D4s_v5 (4 vCPU, 16GB) — pathology is memory-intensive
# Port: 8002 (triage=8000, uncertainty=8001, pathology=8002)

# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev \
    gcc g++ wget \
    # openslide-tools for native SVS support (uncomment to enable):
    # openslide-tools libopenslide-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pathology/requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app:/app/shared" \
    OMP_NUM_THREADS=1 \
    VCPU_COUNT=4 \
    MODEL_CACHE=/models \
    TILE_SIZE=224 \
    MAX_BATCH_SIZE=4 \
    ORT_PROFILING=0

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 wget \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy pathology service source
COPY pathology/ .

# Copy shared CPU inference engine (required by main.py)
COPY shared/ ./shared/

# Model cache directory (populated via AKS PVC ReadOnlyMany in production)
RUN mkdir -p /models && chmod 777 /models

# Non-root user for security
RUN adduser --disabled-password --gecos '' pathuser \
    && chown -R pathuser:pathuser /app /models
USER pathuser

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s \
    CMD wget -qO- http://localhost:8002/health || exit 1

CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8002", \
     "--workers", "1", \
     "--loop", "uvloop", \
     "--no-access-log"]
