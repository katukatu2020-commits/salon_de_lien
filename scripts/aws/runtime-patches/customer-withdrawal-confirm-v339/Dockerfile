ARG BASE_IMAGE=salon-de-lien:shift-empty-cell-drop-v338
FROM ${BASE_IMAGE}

USER root

COPY customer-withdrawal-v309.js /app/customer-withdrawal-v309.js
COPY scripts/aws/runtime-patches/customer-withdrawal-confirm-v339/verify-runtime.mjs /tmp/verify-customer-withdrawal-confirm-v339.mjs

RUN node --check /app/customer-withdrawal-v309.js \
 && node /tmp/verify-customer-withdrawal-confirm-v339.mjs \
 && node --check /app/server.js

USER nextjs
