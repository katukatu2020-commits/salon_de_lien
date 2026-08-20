ARG BASE_IMAGE=salon-de-lien:shift-drag-global-v334
FROM ${BASE_IMAGE}

USER root

COPY shift-drag-cache-v335/patch-runtime.mjs /tmp/shift-drag-cache-v335.mjs
COPY shift-drag-cache-v335/verify-runtime.mjs /tmp/verify-shift-drag-cache-v335.mjs

RUN node /tmp/shift-drag-cache-v335.mjs \
 && node /tmp/verify-shift-drag-cache-v335.mjs \
 && node --check /app/server.js

USER nextjs
