ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d53b3be873e4e2c3fad8fc2359b39a09ad8c4d0a00ff917a43e02cafd46dd81c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v661/

RUN node --check /tmp/lien-v661/loading-recovery-source.mjs \
 && node --check /tmp/lien-v661/patch-runtime.mjs \
 && node --check /tmp/lien-v661/verify-runtime.mjs \
 && node --check /tmp/lien-v661/order-browser-regression.mjs \
 && node --check /tmp/lien-v661/browser-regression.mjs \
 && node --check /tmp/lien-v661/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v661/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v661/patch-runtime.mjs \
 && node --check /app/public/style-admin-controls-v618.js \
 && node --check /app/public/ui-transition-v661.js \
 && node --check /app/.next/server/chunks/1425.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v661/verify-runtime.mjs

USER nextjs
