ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:2d81c191a326060feb9c757816c87cfca44fa463cf9ef4a7dbcc7bd9e3f8598a
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY sales-ledger-summary-v537.js client-sections-v537.js service-list-v537.js sales-ledger-daily-summary-v537.css patch-runtime.mjs verify-runtime.mjs summary-test.mjs /tmp/lien-v537/

RUN node --check /tmp/lien-v537/sales-ledger-summary-v537.js \
 && node --check /tmp/lien-v537/client-sections-v537.js \
 && node --check /tmp/lien-v537/service-list-v537.js \
 && node --check /tmp/lien-v537/patch-runtime.mjs \
 && node --check /tmp/lien-v537/verify-runtime.mjs \
 && node --check /tmp/lien-v537/summary-test.mjs \
 && node /tmp/lien-v537/patch-runtime.mjs \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/sales-ledger-accounts-v318.js \
 && node --check /app/sales-ledger-summary-v537.js \
 && node --check /app/server.js \
 && node /tmp/lien-v537/verify-runtime.mjs \
 && node /tmp/lien-v537/summary-test.mjs \
 && rm -rf /tmp/lien-v537

USER nextjs
