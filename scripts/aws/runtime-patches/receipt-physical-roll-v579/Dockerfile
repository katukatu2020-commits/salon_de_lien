ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:e216762148577154690076fde8b1f47a2eb4d2eefa3a24456a09dffaaf5cb2c1
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY receipt-physical-roll-v579.css receipt-physical-roll-v579.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v579/

RUN node --check /tmp/lien-v579/receipt-physical-roll-v579.js \
 && node --check /tmp/lien-v579/patch-runtime.mjs \
 && node --check /tmp/lien-v579/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v579/patch-runtime.mjs \
 && node --check /app/public/receipt-physical-roll-v579.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v579/verify-runtime.mjs \
 && rm -rf /tmp/lien-v579

USER nextjs
