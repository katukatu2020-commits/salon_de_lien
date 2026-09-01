ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:55566a426b9eb5b41b2663b8b18414b557d0009355379bef765331ef9ca988e9
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY manual-break-cleanup-v522.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v522/

RUN node --check /tmp/lien-v522/manual-break-cleanup-v522.js \
 && node --check /tmp/lien-v522/patch-runtime.mjs \
 && node --check /tmp/lien-v522/verify-runtime.mjs \
 && node /tmp/lien-v522/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/staff-breaks-checkout-menu-client-v442.js \
 && node /tmp/lien-v522/verify-runtime.mjs \
 && rm -rf /tmp/lien-v522

USER nextjs
