# SEWA AI — Go DICOM Ingestion Service Dockerfile
# Multi-stage build: builder → minimal distroless runtime
# Final image: ~10MB (vs ~200MB for Node.js equivalent)

# ── Stage 1: Builder ────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /build

# Download dependencies first (cached layer)
COPY go.mod go.sum* ./
RUN go mod download

# Copy source
COPY . .

# Build static binary (CGO disabled for truly static binary)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.Version=1.0.0 -X main.BuildTime=$(date -u +%Y%m%dT%H%M%SZ)" \
    -trimpath \
    -o dicom-ingestion \
    ./main.go

# ── Stage 2: Runtime (distroless — no shell, no package manager) ─
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

# Copy binary only
COPY --from=builder /build/dicom-ingestion /app/dicom-ingestion

# Expose DICOM C-STORE port and HTTP health/metrics port
EXPOSE 11112 8090

# Non-root user (distroless default)
USER nonroot:nonroot

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["/app/dicom-ingestion", "-health-check"] || exit 1

ENTRYPOINT ["/app/dicom-ingestion"]
