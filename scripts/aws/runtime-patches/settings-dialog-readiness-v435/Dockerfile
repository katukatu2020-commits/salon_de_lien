ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:63d9d4049a7c7d8bc306861c02cdfd578c47c29e7dde7cc28a5f4a3bf35a996d
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v435/

RUN node --check /tmp/lien-v435/patch-runtime.mjs \
 && node /tmp/lien-v435/patch-runtime.mjs \
 && node --check /app/commercial-admin-v101.js \
 && node /tmp/lien-v435/verify-runtime.mjs \
 && rm -rf /tmp/lien-v435

USER nextjs
