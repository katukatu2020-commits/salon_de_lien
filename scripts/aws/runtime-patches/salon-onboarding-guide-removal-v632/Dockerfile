ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v632/

RUN node --check /tmp/lien-v632/patch-runtime.mjs \
 && node --check /tmp/lien-v632/verify-runtime.mjs \
 && node --check /tmp/lien-v632/browser-regression.mjs \
 && node --check /tmp/lien-v632/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v632/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/tenant-setup-client.js \
 && node --check /app/commercial-admin-v101.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v632/verify-runtime.mjs

USER nextjs
