ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:243da21975389bcbdce478a8a7502e5aa63a86da234420ba85d912026f37181d
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v656/

RUN node --check /tmp/lien-v656/patch-runtime.mjs \
 && node --check /tmp/lien-v656/verify-runtime.mjs \
 && node --check /tmp/lien-v656/integration.mjs \
 && node --check /tmp/lien-v656/browser-regression.mjs \
 && node --check /tmp/lien-v656/render-document-fixtures.mjs \
 && node --check /tmp/lien-v656/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v656/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v656/patch-runtime.mjs \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v656/verify-runtime.mjs

USER nextjs
