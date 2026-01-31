# Frontend Dockerfile - Multi-stage build for optimal image size
# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Runtime (minimal image)
FROM node:18-alpine

WORKDIR /app

# Copy only built artifacts and package files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/*

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
