# syntax=docker/dockerfile:1.7

FROM postgres:16-bookworm AS postgres-tools

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl postgresql-client \
  && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci

FROM base AS production-dependencies
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS builder
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --create-home nextjs

COPY --from=production-dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts/import-postgres-dump.mjs ./scripts/import-postgres-dump.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/upsert-staff-accounts.mjs ./scripts/upsert-staff-accounts.mjs
COPY --from=postgres-tools /usr/lib/postgresql/16/bin/pg_restore /usr/local/bin/pg_restore
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh /usr/local/bin/lien-entrypoint

RUN chmod 0555 /usr/local/bin/lien-entrypoint /usr/local/bin/pg_restore \
  && pg_restore --version | grep '16\.'

USER nextjs
EXPOSE 3000
ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]
