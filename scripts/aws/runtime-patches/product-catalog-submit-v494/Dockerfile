ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:98ba7327931de6d55d77eece44656b5dea8c65583e174d781d533d55902603fb
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v494/
RUN node --check /tmp/lien-v494/patch-runtime.mjs \
 && node --check /tmp/lien-v494/verify-runtime.mjs \
 && node --check /tmp/lien-v494/test-runtime.mjs \
 && node /tmp/lien-v494/patch-runtime.mjs \
 && node --check /app/commercial-admin-v101.js \
 && node /tmp/lien-v494/verify-runtime.mjs \
 && node /tmp/lien-v494/test-runtime.mjs \
 && rm -rf /tmp/lien-v494

USER nextjs
