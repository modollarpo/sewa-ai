# Validation image — used for CQ500 preprocessing job and local evaluation.
# Multi-stage: builder installs deps, final is slim Python.
# FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

FROM python:3.11-slim AS builder
WORKDIR /build

# System deps for pydicom, torch, scipy
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY validation/requirements-validation.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements-validation.txt

# ----------------------------------------------------------------
FROM python:3.11-slim AS final
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

# Copy validation module and model checkpoint
COPY validation/ ./validation/
COPY validation/models/classifier_v2a1.pt ./validation/models/classifier_v2a1.pt

# Non-root user
RUN useradd -m appuser && chown -R appuser /app
USER appuser

ENV PYTHONPATH=/app
CMD ["python", "-m", "validation.scripts.step9a_cq500_preprocess", "--help"]
