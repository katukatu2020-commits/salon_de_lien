ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:f438141f87f22cba61e121734b8f8ce0029950e8969936e5b87b07cfb6fe1f1e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v655/

RUN node --check /tmp/lien-v655/patch-runtime.mjs \
 && node --check /tmp/lien-v655/verify-runtime.mjs \
 && node --check /tmp/lien-v655/integration.mjs \
 && node --check /tmp/lien-v655/browser-regression.mjs \
 && node --check /tmp/lien-v655/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v655/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v655/patch-runtime.mjs \
 && node --check /app/sales-ledger-accounts-v318.js \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v655/verify-runtime.mjs

USER nextjs
