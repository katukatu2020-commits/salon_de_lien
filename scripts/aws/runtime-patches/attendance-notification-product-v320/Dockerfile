ARG BASE_IMAGE=salon-de-lien:shift-drag-notification-v319
FROM ${BASE_IMAGE}

COPY attendance-notification-product-v320.js /app/attendance-notification-product-v320.js
COPY attendance-client-v320.js /app/attendance-client-v320.js
COPY patch-runtime.mjs /tmp/patch-runtime-v320.mjs

RUN node /tmp/patch-runtime-v320.mjs \
 && node --check /app/attendance-notification-product-v320.js \
 && node --check /app/attendance-client-v320.js \
 && node --check /app/server.js \
 && node --check /app/catalog-operations.js \
 && node --check /app/commercial-admin-v101.js
