ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b5b03adcaae35752bddc2e6f1b7a2c2bdf105205ac1aba3bb8b8a7873548be14
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-management-v470.js /app/content-management-v465.js
COPY content-edit-delete-client-v470.js /app/
COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs smoke-production.mjs /tmp/lien-v470/
RUN node --check /app/content-management-v465.js \
 && node --check /app/content-edit-delete-client-v470.js \
 && node --check /tmp/lien-v470/patch-runtime.mjs \
 && node --check /tmp/lien-v470/verify-runtime.mjs \
 && node --check /tmp/lien-v470/test-runtime.mjs \
 && node --check /tmp/lien-v470/smoke-production.mjs \
 && node /tmp/lien-v470/patch-runtime.mjs \
 && node /tmp/lien-v470/verify-runtime.mjs \
 && LIEN_CONTENT_SERVICE=/app/content-management-v465.js node /tmp/lien-v470/test-runtime.mjs \
 && rm -rf /tmp/lien-v470

USER nextjs
