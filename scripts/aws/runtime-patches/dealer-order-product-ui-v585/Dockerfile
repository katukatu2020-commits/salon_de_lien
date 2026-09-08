ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b3baeaf5d78d539d5365580f616d808da07f5f75db06e231af024a13c27cb9e1
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY wholesale-ordering-client-v543.js wholesale-ordering-v543.css /app/
COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v585/

RUN node --check /app/wholesale-ordering-client-v543.js \
 && node --check /tmp/lien-v585/patch-runtime.mjs \
 && node --check /tmp/lien-v585/verify-runtime.mjs \
 && node --check /tmp/lien-v585/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v585/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v585/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/public/inventory-orders-common-layout-v572.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v585/verify-runtime.mjs \
 && rm -rf /tmp/lien-v585

USER nextjs
