ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:3eff227a45ac2ba429c492560757855c60b1465d774038e0def0f2a9e0b44a32
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v668/

RUN node --check /tmp/lien-v668/customer-store-frequency-v668.js \
 && node --check /tmp/lien-v668/patch-runtime.mjs \
 && node --check /tmp/lien-v668/verify-runtime.mjs \
 && node --check /tmp/lien-v668/integration.mjs \
 && node --check /tmp/lien-v668/browser-regression.mjs \
 && node --check /tmp/lien-v668/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v668/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v668/patch-runtime.mjs \
 && node --check /app/customer-store-frequency-v668.js \
 && node --check /app/customer-links-v293.js \
 && node --check /app/customer-link-ui-v293.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v668/verify-runtime.mjs

USER nextjs
