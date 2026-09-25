ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:6ad3c746e9ad0d868b00bd608ef2c38b07aaad48019f462a0d07be99c3a64bce
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v660/

RUN node --check /tmp/lien-v660/recovery-source.mjs \
 && node --check /tmp/lien-v660/patch-runtime.mjs \
 && node --check /tmp/lien-v660/verify-runtime.mjs \
 && node --check /tmp/lien-v660/browser-regression.mjs \
 && node --check /tmp/lien-v660/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v660/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v660/patch-runtime.mjs \
 && node --check /app/.next/server/chunks/1425.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v660/verify-runtime.mjs

USER nextjs
