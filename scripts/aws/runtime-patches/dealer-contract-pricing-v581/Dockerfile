ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:16e02a49b4224d6ab1aa4b403e2e62fbdbd4bcdf044d965f3539c7d24fa20281
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY wholesale-ordering-v543.js wholesale-ordering-client-v543.js wholesale-ordering-v543.css /app/
COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v581/

RUN node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /tmp/lien-v581/patch-runtime.mjs \
 && node --check /tmp/lien-v581/verify-runtime.mjs \
 && node --check /tmp/lien-v581/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v581/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v581/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/inventory-orders-common-layout-v572.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v581/verify-runtime.mjs \
 && rm -rf /tmp/lien-v581

USER nextjs
