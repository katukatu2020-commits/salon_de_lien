ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:6ba80032cf9114e2114f33aa8b55b0ad6ef6495cf295f91ea2e483c62f85073b
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v580/

RUN node --check /tmp/lien-v580/patch-runtime.mjs \
 && node --check /tmp/lien-v580/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v580/patch-runtime.mjs \
 && node --check /app/.next/server/app/admin/customers/messages/page.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v580/verify-runtime.mjs \
 && rm -rf /tmp/lien-v580

USER nextjs
