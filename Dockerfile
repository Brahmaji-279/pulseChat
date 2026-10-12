# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install native build dependencies
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies required to compile native Node.js modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Keep your existing additional COPY instructions here.
# For example, copy any required configuration or public assets.

# Preserve the correct entry point from your existing Dockerfile.
CMD ["node", "dist/server.js"]
