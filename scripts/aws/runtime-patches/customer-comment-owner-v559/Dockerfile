ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:59a70c8bba1d42ec9f1c04f3270f66b11e82b02c7e2bbc5e8ed712a1eca88360
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-management-v559.js /app/content-management-v465.js
COPY content-edit-delete-client-v559.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs test-service.mjs test-patch.mjs /tmp/lien-v559/

RUN node --check /app/content-management-v465.js \
 && node --check /tmp/lien-v559/content-edit-delete-client-v559.js \
 && node --check /tmp/lien-v559/patch-runtime.mjs \
 && node --check /tmp/lien-v559/verify-runtime.mjs \
 && node --check /tmp/lien-v559/test-runtime.mjs \
 && node --check /tmp/lien-v559/test-service.mjs \
 && node --check /tmp/lien-v559/test-patch.mjs \
 && node /tmp/lien-v559/test-runtime.mjs \
 && LIEN_CONTENT_SERVICE=/app/content-management-v465.js node /tmp/lien-v559/test-service.mjs \
 && node /tmp/lien-v559/test-patch.mjs \
 && node /tmp/lien-v559/patch-runtime.mjs \
 && node --check /app/public/content-edit-delete-client-v559.js \
 && node --check /app/content-management-v465.js \
 && node --check /app/server.js \
 && node /tmp/lien-v559/verify-runtime.mjs \
 && rm -rf /tmp/lien-v559

USER nextjs
