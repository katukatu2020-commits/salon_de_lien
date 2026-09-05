ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:9d4f05b12602375ffc546e690ed1886e329b63ebc669fa35b159d5dd4cca0a51
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY sales-ledger-staff-multiselect-v542.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v542/

RUN node --check /tmp/lien-v542/patch-runtime.mjs \
 && node --check /tmp/lien-v542/verify-runtime.mjs \
 && node /tmp/lien-v542/patch-runtime.mjs \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/sales-ledger-accounts-v318.js \
 && node --check /app/server.js \
 && node /tmp/lien-v542/verify-runtime.mjs \
 && rm -rf /tmp/lien-v542

USER nextjs
