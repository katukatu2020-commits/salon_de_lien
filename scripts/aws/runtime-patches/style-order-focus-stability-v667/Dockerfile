ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:8631d8f9ed50617afe27139225c7e4f50bfcd0aee59469663e1cdaae11c112bf
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v667/
COPY style-order-focus-stability-v667.js /app/public/style-order-focus-stability-v667.js

RUN node --check /tmp/lien-v667/runtime-transform.mjs \
 && node --check /tmp/lien-v667/patch-runtime.mjs \
 && node --check /tmp/lien-v667/verify-runtime.mjs \
 && node --check /tmp/lien-v667/test-runtime.mjs \
 && node --check /tmp/lien-v667/browser-check.mjs \
 && node --check /tmp/lien-v667/browser-regression.mjs \
 && node --check /tmp/lien-v667/integration-browser-regression.mjs \
 && node --check /tmp/lien-v667/production-smoke.mjs \
 && node --check /app/public/style-order-focus-stability-v667.js \
 && node /tmp/lien-v667/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v667/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v667/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/style-admin-controls-v618.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v667/verify-runtime.mjs

USER nextjs
