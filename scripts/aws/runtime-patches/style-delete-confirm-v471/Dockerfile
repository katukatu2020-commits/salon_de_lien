ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b54f43ba4db4f0bf396fc1b5b71510521a7ad2e08c9b437879e85b751220a922
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-management-v471.js /app/content-management-v465.js
COPY content-edit-delete-client-v471.js /app/
COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs smoke-production.mjs /tmp/lien-v471/
RUN node --check /app/content-management-v465.js \
 && node --check /app/content-edit-delete-client-v471.js \
 && node --check /tmp/lien-v471/patch-runtime.mjs \
 && node --check /tmp/lien-v471/verify-runtime.mjs \
 && node --check /tmp/lien-v471/test-runtime.mjs \
 && node --check /tmp/lien-v471/smoke-production.mjs \
 && node /tmp/lien-v471/patch-runtime.mjs \
 && node /tmp/lien-v471/verify-runtime.mjs \
 && LIEN_CONTENT_SERVICE=/app/content-management-v465.js node /tmp/lien-v471/test-runtime.mjs \
 && rm -rf /tmp/lien-v471

USER nextjs
