ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:platform-customer-account-delete-v357
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

RUN cp /usr/local/bin/lien-entrypoint /usr/local/bin/lien-entrypoint-v357

COPY scripts/aws/runtime-patches/community-prisma-consistency-v358/patch-prisma-schema.mjs /tmp/patch-community-prisma-consistency-v358.mjs
COPY scripts/aws/runtime-patches/community-prisma-consistency-v358/verify-runtime.mjs /tmp/verify-community-prisma-consistency-v358.mjs
COPY scripts/aws/runtime-patches/community-prisma-consistency-v358/ensure-community-schema.cjs /app/ensure-community-schema.cjs
COPY scripts/aws/runtime-patches/community-prisma-consistency-v358/lien-entrypoint /usr/local/bin/lien-entrypoint

RUN node /tmp/patch-community-prisma-consistency-v358.mjs \
 && npx prisma generate \
 && node --check /app/ensure-community-schema.cjs \
 && node /tmp/verify-community-prisma-consistency-v358.mjs \
 && chmod 0755 /usr/local/bin/lien-entrypoint /usr/local/bin/lien-entrypoint-v357

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
