ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v639/

RUN node --check /tmp/lien-v639/patch-runtime.mjs \
 && node --check /tmp/lien-v639/verify-runtime.mjs \
 && node --check /tmp/lien-v639/browser-regression.mjs \
 && node --check /tmp/lien-v639/production-browser.mjs \
 && node --check /tmp/lien-v639/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v639/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/ui-transition-v639.js \
 && node --check /app/public/style-system-integration-v602.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v639/verify-runtime.mjs

USER nextjs
