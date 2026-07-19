# Railway / production — Node 20 (Next.js 16)
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Build-time only DB (not persisted). Runtime uses Volume at /app/data
RUN DATABASE_URL="file:./build.db" npx prisma generate \
  && DATABASE_URL="file:./build.db" npx prisma db push --skip-generate \
  && DATABASE_URL="file:./build.db" npx next build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV DATABASE_URL=file:/app/data/prod.db
ENV UPLOAD_DIR=/app/data/uploads

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.ts ./

# Persistent data lives on Railway Volume mounted at /app/data
RUN mkdir -p /app/data/uploads

EXPOSE 8080
CMD ["node", "scripts/start-prod.mjs"]
