ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:35f4cb6009549e9b45f101d07ba99341add7b1a7c45592f97d1a70ae227df59c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs shared-account-service-v552.js /tmp/lien-v552/

RUN node --check /tmp/lien-v552/patch-runtime.mjs \
 && node --check /tmp/lien-v552/verify-runtime.mjs \
 && node --check /tmp/lien-v552/test-runtime.mjs \
 && node --check /tmp/lien-v552/shared-account-service-v552.js \
 && node /tmp/lien-v552/test-runtime.mjs \
 && node /tmp/lien-v552/patch-runtime.mjs \
 && node --check /app/shared-account-service-v552.js \
 && node --check /app/sales-ledger-accounts-v318.js \
 && node --check /app/server.js \
 && node /tmp/lien-v552/verify-runtime.mjs \
 && rm -rf /tmp/lien-v552

USER nextjs
