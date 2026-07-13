# SEWA XAI — ai-services/continuous-learning/Dockerfile
# Multi-stage build for smaller, more secure image

# ── Stage 1: Build ─────────────────────────────────────────────
FROM python:3.11-slim AS builder
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────
FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY --from=builder /install /usr/local
COPY . .

RUN mkdir -p /models && chmod 755 /models

RUN adduser --disabled-password --gecos '' aiuser \
    && chown -R aiuser:aiuser /app /models
USER aiuser

EXPOSE 8005
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s \
  CMD wget -qO- http://localhost:8005/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005", "--workers", "2", "--loop", "uvloop", "--no-access-log"]
