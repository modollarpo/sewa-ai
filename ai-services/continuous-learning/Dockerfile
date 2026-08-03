# SEWA XAI — ai-services/continuous-learning/Dockerfile
# Multi-stage build for CL service with ONNX fine-tuning pipeline

# ── Stage 1: Build ─────────────────────────────────────────────
FROM python:3.11-slim AS builder
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev wget gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
# PyTorch CPU-only index - significantly smaller than default (CUDA) wheel
RUN pip install --prefix=/install \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────
FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=4 \
    MKL_NUM_THREADS=4

COPY --from=builder /install /usr/local
ARG CACHE_BUST=dev
RUN echo "cachebust-$CACHE_BUST"
COPY main.py /app/

RUN mkdir -p /models && chmod 755 /models

RUN adduser --disabled-password --gecos '' aiuser \
    && chown -R aiuser:aiuser /app /models
USER aiuser

EXPOSE 8005
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s \
  CMD wget -qO- http://localhost:8005/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005", "--workers", "1", "--loop", "uvloop", "--no-access-log"]
