ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v649/

RUN node --check /tmp/lien-v649/patch-runtime.mjs \
 && node --check /tmp/lien-v649/verify-runtime.mjs \
 && node --check /tmp/lien-v649/browser-regression.mjs \
 && node --check /tmp/lien-v649/production-browser.mjs \
 && node --check /tmp/lien-v649/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v649/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v649/patch-runtime.mjs \
 && node --check /app/public/style-admin-controls-v618.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v649/verify-runtime.mjs

USER nextjs
