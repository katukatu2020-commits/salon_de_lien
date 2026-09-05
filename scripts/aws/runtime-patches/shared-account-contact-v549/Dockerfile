ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:e037a21314925ee52bd1563665fd2850896f8bfddc773d587657744b78c1abdf
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY shared-account-service-v549.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v549/

RUN node --check /tmp/lien-v549/shared-account-service-v549.js \
 && node --check /tmp/lien-v549/patch-runtime.mjs \
 && node --check /tmp/lien-v549/verify-runtime.mjs \
 && node --check /tmp/lien-v549/test-runtime.mjs \
 && node /tmp/lien-v549/test-runtime.mjs \
 && node /tmp/lien-v549/patch-runtime.mjs \
 && node --check /app/shared-account-service-v549.js \
 && node --check /app/sales-ledger-accounts-v318.js \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/public-site.js \
 && node --check /app/server.js \
 && node /tmp/lien-v549/verify-runtime.mjs \
 && rm -rf /tmp/lien-v549

USER nextjs
