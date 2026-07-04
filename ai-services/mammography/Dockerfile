# SEWA XAI — ai-services/mammography/Dockerfile (CPU Edition)
# Multi-stage build — runtime image ~400MB vs ~3.5GB GPU build
#
# Stage 1: Builder — installs all deps including torch (for potential export)
# Stage 2: Runtime — only what's needed for ORT inference
#
# Target: Standard_F8s_v2 (8 vCPU / 16GB RAM) on Azure AKS
# Intel Ice Lake / Sapphire Rapids nodes: add --platform linux/amd64 for AVX-512

# ── Stage 1: Build ─────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev gcc g++ wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into /install (isolated from system)
COPY requirements.txt .

# PyTorch CPU-only index — significantly smaller than default (CUDA) wheel
RUN pip install --prefix=/install \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt


# ── Stage 2: Runtime ───────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app:/app/shared" \
    OMP_NUM_THREADS=1 \
    # Prevent ORT from spawning more threads than vCPU allocation
    # Override via env var in K8s deployment
    VCPU_COUNT=8 \
    MODEL_CACHE=/models \
    # ORT tuning: use all available cores, no profiling in prod
    ORT_PROFILING=0

# Runtime system libs only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 wget \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy source
COPY . .


# Model cache directory (populated via AKS PVC in production)
RUN mkdir -p /models && chmod 777 /models

# Non-root user
RUN adduser --disabled-password --gecos '' aiuser \
    && chown -R aiuser:aiuser /app /models
USER aiuser

EXPOSE 8003

# Reduced healthcheck interval — startup can take ~30s for model load+warmup
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s \
    CMD wget -qO- http://localhost:8003/health || exit 1

# Single uvicorn worker — ORT manages its own thread pool internally.
# Horizontal scaling: add replicas in K8s, NOT uvicorn workers.
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8003", \
     "--workers", "1", \
     "--loop", "uvloop", \
     "--no-access-log"]
