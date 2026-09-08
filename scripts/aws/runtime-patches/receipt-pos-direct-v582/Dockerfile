ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:dcbc6b48987120affd4ec91b545871ec34fa1871689c802a0f23e10f259a3e00
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY receipt-pos-direct-v582.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v582/

RUN node --check /tmp/lien-v582/receipt-pos-direct-v582.js \
 && node --check /tmp/lien-v582/patch-runtime.mjs \
 && node --check /tmp/lien-v582/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v582/patch-runtime.mjs \
 && node --check /app/public/receipt-pos-direct-v582.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v582/verify-runtime.mjs \
 && rm -rf /tmp/lien-v582

USER nextjs
