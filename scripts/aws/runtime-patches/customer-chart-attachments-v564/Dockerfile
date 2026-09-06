ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:6e0f87d29181a0ca4fadbcca62e106baeeb898f820fe383f9ad9d09336928fe0
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-chart-attachments-service-v564.js customer-chart-attachments-client-v564.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v564/

RUN node --check /tmp/lien-v564/customer-chart-attachments-service-v564.js \
 && node --check /tmp/lien-v564/customer-chart-attachments-client-v564.js \
 && node --check /tmp/lien-v564/patch-runtime.mjs \
 && node --check /tmp/lien-v564/verify-runtime.mjs \
 && node --check /tmp/lien-v564/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v564/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/customer-chart-attachments-v564.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v564/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v564/verify-runtime.mjs \
 && rm -rf /tmp/lien-v564

USER nextjs
