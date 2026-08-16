FROM node:20-bookworm-slim

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci \
  && npx prisma generate

COPY scripts/seed-showcase-tenant.ts ./scripts/seed-showcase-tenant.ts
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY src/lib/auth/password.ts ./src/lib/auth/password.ts
COPY src/lib/demo/showcase-tenant.ts ./src/lib/demo/showcase-tenant.ts
RUN chmod +x ./scripts/docker-entrypoint.sh

USER node
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["./node_modules/.bin/tsx", "scripts/seed-showcase-tenant.ts"]
