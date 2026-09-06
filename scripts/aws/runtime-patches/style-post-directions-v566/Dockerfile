ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:3352e993d4921f36c04f2febb08ee29e197583e3c8cb88717ce5626e920c8a5f
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY community-publishing-v566.js community-publishing-client-v566.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v566/

RUN node --check /tmp/lien-v566/community-publishing-v566.js \
 && node --check /tmp/lien-v566/community-publishing-client-v566.js \
 && node --check /tmp/lien-v566/patch-runtime.mjs \
 && node --check /tmp/lien-v566/verify-runtime.mjs \
 && node --check /tmp/lien-v566/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v566/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/community-publishing-v566.js \
 && node --check /app/community-publishing-client-v566.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v566/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v566/verify-runtime.mjs \
 && rm -rf /tmp/lien-v566

USER nextjs
