# ===========================================
# COST SYSTEM BACKEND - DOCKERFILE
# ===========================================

# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=Europe/Istanbul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p data logs && \
    chown -R nodejs:nodejs data logs

# Set file permissions
RUN chmod +x scripts/*.sh 2>/dev/null || true

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/api/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Start application
CMD ["npm", "start"]

# Labels for better container management
LABEL maintainer="burak.mumcu@example.com"
LABEL version="2.0.0"
LABEL description="Cost System Backend API"
LABEL org.opencontainers.image.source="https://github.com/burak-mumcu/cost-system-backend"
LABEL org.opencontainers.image.documentation="https://github.com/burak-mumcu/cost-system-backend#readme"