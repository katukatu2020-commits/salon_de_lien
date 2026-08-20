ARG BASE_IMAGE=salon-de-lien:shared-account-settings-v324
FROM ${BASE_IMAGE}

USER root

COPY shift-drag-fluid-v325/patch-runtime.mjs /tmp/shift-drag-fluid-v325.mjs
COPY shift-drag-fluid-v325/verify-runtime.mjs /tmp/verify-shift-drag-fluid-v325.mjs

RUN node /tmp/shift-drag-fluid-v325.mjs \
 && node /tmp/verify-shift-drag-fluid-v325.mjs \
 && node --check /app/server.js

USER nextjs
