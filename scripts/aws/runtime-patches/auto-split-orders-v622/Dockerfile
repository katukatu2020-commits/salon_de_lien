ARG BASE_IMAGE=salon-de-lien:all-dealer-order-filter-v621-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs server-batch-function.js client-selection-summary.js client-dialog-submit.js auto-split-orders.css /tmp/lien-v622/

RUN node --check /tmp/lien-v622/patch-runtime.mjs \
 && node --check /tmp/lien-v622/verify-runtime.mjs \
 && node --check /tmp/lien-v622/server-batch-function.js \
 && node --check /tmp/lien-v622/client-selection-summary.js \
 && node --check /tmp/lien-v622/client-dialog-submit.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v622/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /app/public/inventory-orders-common-layout-v572.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v622/verify-runtime.mjs

USER nextjs
