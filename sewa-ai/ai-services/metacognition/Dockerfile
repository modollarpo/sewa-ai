# SEWA AI — ai-services/metacognition/Dockerfile (CPU Edition)
# Pure Python rule engine — no GPU, no ML model, no OpenCV.
# Final image: ~150MB (vs ~3.5GB GPU original)
FROM python:3.11-slim AS builder
WORKDIR /build
ENV PIP_NO_CACHE_DIR=1
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY --from=builder /install /usr/local
COPY . .

RUN adduser --disabled-password --gecos '' aiuser \
    && chown -R aiuser:aiuser /app
USER aiuser

EXPOSE 8003
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8003/health')" || exit 1
# 4 workers: pure CPU rule evaluation, no model lock contention
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", \
     "--workers", "4", "--loop", "uvloop", "--no-access-log"]
