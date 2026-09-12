ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v628/

RUN node --check /tmp/lien-v628/patch-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v628/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /app/style-admin-controls-v618.js \
 && node --check /app/public/style-admin-controls-v618.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v628/verify-runtime.mjs

USER nextjs
