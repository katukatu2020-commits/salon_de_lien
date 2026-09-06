ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:443c5cdd83435ab801caaa7eb7033760e2317bf52a0aa597eafffafc5f3292e4
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-chart-attachments-service-v567.js customer-chart-attachments-client-v567.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v567/

RUN node --check /tmp/lien-v567/customer-chart-attachments-service-v567.js \
 && node --check /tmp/lien-v567/customer-chart-attachments-client-v567.js \
 && node --check /tmp/lien-v567/patch-runtime.mjs \
 && node --check /tmp/lien-v567/verify-runtime.mjs \
 && node --check /tmp/lien-v567/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v567/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/customer-chart-attachments-v567.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v567/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v567/verify-runtime.mjs \
 && rm -rf /tmp/lien-v567

USER nextjs
