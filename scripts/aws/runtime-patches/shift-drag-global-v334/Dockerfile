ARG BASE_IMAGE=salon-de-lien:shift-drag-capture-v333
FROM ${BASE_IMAGE}

USER root

COPY shift-drag-global-v334/patch-runtime.mjs /tmp/shift-drag-global-v334.mjs
COPY shift-drag-global-v334/verify-runtime.mjs /tmp/verify-shift-drag-global-v334.mjs

RUN node /tmp/shift-drag-global-v334.mjs \
 && node /tmp/verify-shift-drag-global-v334.mjs \
 && node --check /app/server.js

USER nextjs
