# SEWA XAI — ai-services/uncertainty/Dockerfile (CPU Edition)
FROM python:3.11-slim AS builder
WORKDIR /build
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 gcc g++ wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app:/app/shared" \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    VCPU_COUNT=8 \
    MC_DROPOUT_PASSES=10 \
    MODEL_CACHE=/models \
    ORT_PROFILING=0

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 wget \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY . .


RUN mkdir -p /models && chmod 777 /models
RUN adduser --disabled-password --gecos '' aiuser \
    && chown -R aiuser:aiuser /app /models
USER aiuser

EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s \
    CMD wget -qO- http://localhost:8002/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", \
     "--workers", "1", "--loop", "uvloop", "--no-access-log"]
