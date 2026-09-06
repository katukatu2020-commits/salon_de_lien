ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:f461ee5305f75504fcd8f374ad4942e58f4ebe0312014674845b9cd06edc3228
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY salon-operations-v561.js customer-chart-client-v561.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v561/

RUN node --check /tmp/lien-v561/salon-operations-v561.js \
 && node --check /tmp/lien-v561/customer-chart-client-v561.js \
 && node --check /tmp/lien-v561/patch-runtime.mjs \
 && node --check /tmp/lien-v561/verify-runtime.mjs \
 && node --check /tmp/lien-v561/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v561/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/salon-operations-v561.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/attendance-history-editor-v497.js \
 && node --check /app/attendance-client-v497.js \
 && node --check /app/customer-merge-v385.js \
 && node --check /app/customer-name-auto-merge-v489.js \
 && node --check /app/sales-ledger-client-v318.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v561/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v561/verify-runtime.mjs \
 && rm -rf /tmp/lien-v561

USER nextjs
