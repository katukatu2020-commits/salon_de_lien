ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:4ade7cc04d86579267d3225e0d4204896e3ddf8c0734574a4d2457af41f8e6f2
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-management-v465.js content-edit-delete-client-v465.js /app/
COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs smoke-production.mjs /tmp/lien-v465/
RUN node --check /app/content-management-v465.js \
 && node --check /app/content-edit-delete-client-v465.js \
 && node --check /tmp/lien-v465/patch-runtime.mjs \
 && node --check /tmp/lien-v465/verify-runtime.mjs \
 && node --check /tmp/lien-v465/test-runtime.mjs \
 && node --check /tmp/lien-v465/smoke-production.mjs \
 && node /tmp/lien-v465/patch-runtime.mjs \
 && node /tmp/lien-v465/verify-runtime.mjs \
 && node /tmp/lien-v465/test-runtime.mjs \
 && rm -rf /tmp/lien-v465

USER nextjs
