ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:aa9f09dc6323a8ca915054084035af1b69691d861ecb5cbc91cda4264d2114cf
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v535/

RUN node --check /tmp/lien-v535/patch-runtime.mjs \
 && node --check /tmp/lien-v535/verify-runtime.mjs \
 && node /tmp/lien-v535/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/staff-breaks-checkout-menu-client-v442.js \
 && node --check /app/staff-breaks-checkout-menu-v442.js \
 && node /tmp/lien-v535/verify-runtime.mjs \
 && rm -rf /tmp/lien-v535

USER nextjs
