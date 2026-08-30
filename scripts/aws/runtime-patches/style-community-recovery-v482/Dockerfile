ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c03d89f96bd0ed8a33af9c6d0b8c568a4d8fba4be9ce9138d937f10e5fb88df1
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-management-v482.js /app/content-management-v465.js
COPY content-edit-delete-client-v482.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs test-service.mjs /tmp/lien-v482/
RUN node --check /app/content-management-v465.js \
 && node --check /tmp/lien-v482/content-edit-delete-client-v482.js \
 && node --check /tmp/lien-v482/patch-runtime.mjs \
 && node --check /tmp/lien-v482/verify-runtime.mjs \
 && node --check /tmp/lien-v482/test-runtime.mjs \
 && node --check /tmp/lien-v482/test-service.mjs \
 && node /tmp/lien-v482/patch-runtime.mjs \
 && node /tmp/lien-v482/verify-runtime.mjs \
 && LIEN_CONTENT_SERVICE=/app/content-management-v465.js node /tmp/lien-v482/test-runtime.mjs \
 && LIEN_CONTENT_SERVICE=/app/content-management-v465.js node /tmp/lien-v482/test-service.mjs \
 && rm -rf /tmp/lien-v482

USER nextjs
