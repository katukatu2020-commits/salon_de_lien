ARG BASE_IMAGE=salon-de-lien:style-detail-loading-recovery-v639-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v640/

RUN node --check /tmp/lien-v640/patch-runtime.mjs \
 && node --check /tmp/lien-v640/style-list-thumbnail-v640.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v640/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/style-list-thumbnail-v640.js \
 && node --check /app/style-community-controls-v610.js \
 && node --check /app/style-admin-controls-v618.js \
 && node --check /app/public/style-community-controls-v610.js \
 && node --check /app/public/style-admin-controls-v618.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v640/verify-runtime.mjs

USER nextjs
