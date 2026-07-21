# Dockerfile for SEWA Backend Clinical Verification Service
# Built on top of the main SEWA backend image with enhanced clinical decision support
FROM sewaaiproductionacr.azurecr.io/sewa-backend:prod-latest

# User vars
ARG NODE_ENV=production
ARG APP_PORT=3001

# Set environment variables
ENV NODE_ENV=$NODE_ENV
ENV PORT=$APP_PORT
ENV DISABLE_FULL_CLIL_TOOLS_FOR_TESTING="1"

# Install runtime dependencies for enhanced clinical services
RUN npm install --production --only=production 

# Create application user
RUN useradd --uid 1001 --gid 1001 secaudit

# Copy application files
COPY --chown=1001:1001 backend/services/clinical-verification/ ./clinical-verification/

# Set working directory
WORKDIR /clinical-verification

# Build the enhanced clinical verification service
RUN npm run build:clinical || npm run build

# Create logs directory
RUN mkdir -p /logs && chown 1001:1001 /logs

# Switch to non-root user for security
USER 1001:1001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:$APP_PORT/health || exit 1

# Expose application port
EXPOSE $APP_PORT

# Default command
CMD ["node", "dist/index.js"]

# Labels for service discovery
LABEL maintainer="SEWA AI Clinical Platform" \
    version="2.4.1" \
    description="Enhanced Clinical AI Verification Service" \
    service="clinical-verification" \
    compliance="HIPAA-GDPR-UKCA" \
    ai-engine="confidence-scorer" \
    audit-enabled="true" \
    container="clinical-audit-service"
