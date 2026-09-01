ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c0f8a557c963f6550351b7fed9faa9bbfa7ba3978620db670e0185a5762755ac
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-home-branding-v528.js customer-home-branding-client-v528.js patch-runtime.mjs verify-runtime.mjs test-service.cjs /tmp/lien-v528/

RUN node --check /tmp/lien-v528/customer-home-branding-v528.js \
 && node --check /tmp/lien-v528/customer-home-branding-client-v528.js \
 && node --check /tmp/lien-v528/patch-runtime.mjs \
 && node --check /tmp/lien-v528/verify-runtime.mjs \
 && node --check /tmp/lien-v528/test-service.cjs \
 && node /tmp/lien-v528/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/tenant-setup-client.js \
 && node --check /app/customer-home-branding-v528.js \
 && node /tmp/lien-v528/verify-runtime.mjs \
 && NODE_PATH=/app/node_modules node /tmp/lien-v528/test-service.cjs \
 && rm -rf /tmp/lien-v528

USER nextjs
