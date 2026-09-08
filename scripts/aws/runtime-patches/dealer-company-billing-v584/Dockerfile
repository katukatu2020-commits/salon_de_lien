ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c455fb974c7788e06724659c6cbcbf30b11e05a8fb8dec34fb29791daa08be69
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY billing.js wholesale-ordering-v543.js wholesale-ordering-client-v543.js wholesale-ordering-v543.css /app/
COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v584/

RUN node --check /app/billing.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /tmp/lien-v584/patch-runtime.mjs \
 && node --check /tmp/lien-v584/verify-runtime.mjs \
 && node --check /tmp/lien-v584/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v584/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v584/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/inventory-orders-common-layout-v572.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v584/verify-runtime.mjs \
 && rm -rf /tmp/lien-v584

USER nextjs
