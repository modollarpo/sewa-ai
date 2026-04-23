# SEWA AI — ai-services/federated-learning/Dockerfile
FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# System deps for OpenCV, PyDICOM
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create model cache dir
RUN mkdir -p /models && chmod 777 /models

# Non-root user
RUN adduser --disabled-password --gecos '' aiuser && chown -R aiuser:aiuser /app
USER aiuser

EXPOSE 8004
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s \
  CMD wget -qO- http://localhost:8004/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004", "--workers", "2"]
