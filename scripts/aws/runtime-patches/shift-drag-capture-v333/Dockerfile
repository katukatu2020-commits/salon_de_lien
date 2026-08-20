ARG BASE_IMAGE=salon-de-lien:paid-previous-staff-v332
FROM ${BASE_IMAGE}

USER root

COPY shift-drag-capture-v333/patch-runtime.mjs /tmp/shift-drag-capture-v333.mjs
COPY shift-drag-capture-v333/verify-runtime.mjs /tmp/verify-shift-drag-capture-v333.mjs

RUN node /tmp/shift-drag-capture-v333.mjs \
 && node /tmp/verify-shift-drag-capture-v333.mjs \
 && node --check /app/server.js

USER nextjs
