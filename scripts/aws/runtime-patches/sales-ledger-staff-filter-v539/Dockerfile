ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:bb899a04af538dc994eb97f9e9d621b89c0df1a355260d241361e767c482cd1d
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY sales-ledger-staff-filter-v539.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v539/

RUN node --check /tmp/lien-v539/patch-runtime.mjs \
 && node --check /tmp/lien-v539/verify-runtime.mjs \
 && node /tmp/lien-v539/patch-runtime.mjs \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/server.js \
 && node /tmp/lien-v539/verify-runtime.mjs \
 && rm -rf /tmp/lien-v539

USER nextjs
