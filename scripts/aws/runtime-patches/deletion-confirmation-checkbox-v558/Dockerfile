ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d95c0e7ff10cf23c9615efe4ab5d9e69910eb6c6e09d19fea542232a2a8e24ec
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-edit-delete-client-v558.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs test-patch.mjs /tmp/lien-v558/

RUN node --check /tmp/lien-v558/content-edit-delete-client-v558.js \
 && node --check /tmp/lien-v558/patch-runtime.mjs \
 && node --check /tmp/lien-v558/verify-runtime.mjs \
 && node --check /tmp/lien-v558/test-runtime.mjs \
 && node --check /tmp/lien-v558/test-patch.mjs \
 && node /tmp/lien-v558/test-runtime.mjs \
 && node /tmp/lien-v558/test-patch.mjs \
 && node /tmp/lien-v558/patch-runtime.mjs \
 && node --check /app/public/content-edit-delete-client-v558.js \
 && node --check /app/server.js \
 && node /tmp/lien-v558/verify-runtime.mjs \
 && rm -rf /tmp/lien-v558

USER nextjs
