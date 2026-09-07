ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:e9958a7162a9bcab10d65050a3ffe0934febec505483649eadd433bd86e50dc9
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v577/

RUN node --check /tmp/lien-v577/patch-runtime.mjs \
 && node --check /tmp/lien-v577/verify-runtime.mjs \
 && node /tmp/lien-v577/patch-runtime.mjs \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/tenant-setup-client.js \
 && node --check /app/server.js \
 && node /tmp/lien-v577/verify-runtime.mjs \
 && rm -rf /tmp/lien-v577

USER nextjs
