ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:9bf3b55f8c9cd002bbd0999600b776b5ba477c7e60b7caf957c02392d07dcff7
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY client-sections-v538.js sales-ledger-detail-modal-v538.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v538/

RUN node --check /tmp/lien-v538/client-sections-v538.js \
 && node --check /tmp/lien-v538/patch-runtime.mjs \
 && node --check /tmp/lien-v538/verify-runtime.mjs \
 && node /tmp/lien-v538/patch-runtime.mjs \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/server.js \
 && node /tmp/lien-v538/verify-runtime.mjs \
 && rm -rf /tmp/lien-v538

USER nextjs
