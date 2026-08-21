ARG BASE_IMAGE=salon-de-lien:customer-registration-resend-v347
FROM ${BASE_IMAGE}

USER root

COPY scripts/aws/runtime-patches/community-standalone-v348/community-publishing-v348.js /app/community-publishing-v348.js
COPY scripts/aws/runtime-patches/community-standalone-v348/community-publishing-client-v348.js /app/community-publishing-client-v348.js
COPY scripts/aws/runtime-patches/community-standalone-v348/community-loader-9195.js /tmp/community-loader-9195.js
COPY scripts/aws/runtime-patches/community-standalone-v348/prisma-client/index.js /app/node_modules/.prisma/client/index.js
COPY scripts/aws/runtime-patches/community-standalone-v348/prisma-client/schema.prisma /app/node_modules/.prisma/client/schema.prisma
COPY scripts/aws/runtime-patches/community-standalone-v348/patch-runtime.mjs /tmp/patch-community-standalone-v348.mjs
COPY scripts/aws/runtime-patches/community-standalone-v348/verify-runtime.mjs /tmp/verify-community-standalone-v348.mjs

RUN node /tmp/patch-community-standalone-v348.mjs \
 && node --check /app/server.js \
 && node --check /app/community-publishing-v348.js \
 && node --check /app/community-publishing-client-v348.js \
 && node /tmp/verify-community-standalone-v348.mjs

USER nextjs
