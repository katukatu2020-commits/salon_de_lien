ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:12d55055cdfa1ecc13b8d3579c0bc4578e9c4ce509ffe7059abd683da1d77a1b
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-name-auto-merge-v489.js /app/customer-name-auto-merge-v489.js
COPY patch-runtime.mjs verify-runtime.mjs test-service.mjs integration-test.mjs /tmp/lien-v489/
RUN node --check /app/customer-name-auto-merge-v489.js \
 && node --check /tmp/lien-v489/patch-runtime.mjs \
 && node --check /tmp/lien-v489/verify-runtime.mjs \
 && node --check /tmp/lien-v489/test-service.mjs \
 && node --check /tmp/lien-v489/integration-test.mjs \
 && node /tmp/lien-v489/patch-runtime.mjs \
 && node /tmp/lien-v489/verify-runtime.mjs \
 && LIEN_CUSTOMER_NAME_MERGE_SERVICE=/app/customer-name-auto-merge-v489.js node /tmp/lien-v489/test-service.mjs \
 && rm -rf /tmp/lien-v489

USER nextjs
