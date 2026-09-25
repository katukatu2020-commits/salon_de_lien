ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:bbe1c6790f0643522389c8b0f1737b4ea0d9fcd53731d7c24f85079e99c92357
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v666/
COPY style-order-input-stability-v666.js /app/public/style-order-input-stability-v666.js

RUN node --check /tmp/lien-v666/runtime-transform.mjs \
 && node --check /tmp/lien-v666/patch-runtime.mjs \
 && node --check /tmp/lien-v666/verify-runtime.mjs \
 && node --check /tmp/lien-v666/test-runtime.mjs \
 && node --check /tmp/lien-v666/browser-check.mjs \
 && node --check /tmp/lien-v666/browser-regression.mjs \
 && node --check /tmp/lien-v666/integration-browser-regression.mjs \
 && node --check /tmp/lien-v666/production-smoke.mjs \
 && node --check /app/public/style-order-input-stability-v666.js \
 && node /tmp/lien-v666/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v666/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v666/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/style-admin-controls-v618.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v666/verify-runtime.mjs

USER nextjs
