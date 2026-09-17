ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v651/

RUN node --check /tmp/lien-v651/patch-runtime.mjs \
 && node --check /tmp/lien-v651/verify-runtime.mjs \
 && node --check /tmp/lien-v651/integration.mjs \
 && node --check /tmp/lien-v651/browser-regression.mjs \
 && node --check /tmp/lien-v651/production-smoke.mjs \
 && node --check /tmp/lien-v651/production-browser.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v651/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v651/patch-runtime.mjs \
 && node --check /app/business-inquiries-v637.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v651/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v651/integration.mjs

USER nextjs
