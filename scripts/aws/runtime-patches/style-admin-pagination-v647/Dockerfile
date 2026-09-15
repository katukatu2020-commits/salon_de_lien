ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v647/

RUN node --check /tmp/lien-v647/patch-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v647/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/style-admin-controls-v618.js \
 && node --check /app/public/style-admin-controls-v618.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v647/verify-runtime.mjs

USER nextjs
