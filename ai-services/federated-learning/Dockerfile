# SEWA AI — ai-services/federated-learning/Dockerfile (CPU Edition)
# Multi-stage: builder installs torch+cpu wheel, runtime image stays lean

# ── Stage 1: Builder ────────────────────────────────────────────────
FROM python:3.11-slim AS builder
WORKDIR /build
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install --prefix=/install \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────────
FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app:/app/shared" \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1

# Runtime system libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 wget \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY . .

RUN mkdir -p /models && chmod 777 /models
RUN adduser --disabled-password --gecos '' aiuser \
    && chown -R aiuser:aiuser /app /models
USER aiuser

EXPOSE 8004
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s \
  CMD wget -qO- http://localhost:8004/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004", \
     "--workers", "1", "--loop", "uvloop", "--no-access-log"]

