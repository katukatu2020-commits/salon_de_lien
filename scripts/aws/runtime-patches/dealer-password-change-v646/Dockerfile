ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v646/

RUN node --check /tmp/lien-v646/patch-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v646/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/business-account-approvals-v643.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v646/verify-runtime.mjs

USER nextjs
