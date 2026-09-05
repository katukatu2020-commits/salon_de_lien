ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:7796e6a12537349401a23b2cd12c40145679398fc1ed2365b5a4af4ec1223bf7
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY sales-ledger-month-filter-v534.js patch-runtime.mjs verify-runtime.mjs service-smoke.mjs /tmp/lien-v534/

RUN node --check /tmp/lien-v534/sales-ledger-month-filter-v534.js \
 && node --check /tmp/lien-v534/patch-runtime.mjs \
 && node --check /tmp/lien-v534/verify-runtime.mjs \
 && node --check /tmp/lien-v534/service-smoke.mjs \
 && node /tmp/lien-v534/patch-runtime.mjs \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/sales-ledger-accounts-v318.js \
 && node --check /app/server.js \
 && node /tmp/lien-v534/verify-runtime.mjs \
 && node /tmp/lien-v534/service-smoke.mjs \
 && rm -rf /tmp/lien-v534

USER nextjs
