# SEWA XAI — ai-services/vlm-report/Dockerfile (CPU Edition)
# Minimal image — template-based report generation, no ML model.
# Final image: ~120MB (vs ~3.5GB GPU original)
FROM python:3.11-slim AS builder
WORKDIR /build
ENV PIP_NO_CACHE_DIR=1
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY --from=builder /install /usr/local
ARG CACHE_BUST=dev
RUN echo "cachebust-$CACHE_BUST"
COPY main.py .

RUN adduser --disabled-password --gecos '' aiuser \
    && chown -R aiuser:aiuser /app
USER aiuser

EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", \
     "--workers", "2", "--loop", "uvloop", "--no-access-log"]
