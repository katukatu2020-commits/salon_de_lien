ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:5abb783653677b4884c140356322a40b54d134ca374c4a844ec70fe0bbf8a105
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v669/

RUN node --check /tmp/lien-v669/admin-chat-reply-v669.js \
 && node --check /tmp/lien-v669/admin-chat-reply-client-v669.js \
 && node --check /tmp/lien-v669/patch-runtime.mjs \
 && node --check /tmp/lien-v669/verify-runtime.mjs \
 && node --check /tmp/lien-v669/integration.mjs \
 && node --check /tmp/lien-v669/browser-regression.mjs \
 && node --check /tmp/lien-v669/production-smoke.mjs \
 && node --check /tmp/lien-v669/production-browser.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v669/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v669/patch-runtime.mjs \
 && node --check /app/admin-chat-reply-v669.js \
 && node --check /app/admin-chat-reply-client-v669.js \
 && node --check /app/admin-chat-inbox-v589.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v669/verify-runtime.mjs

USER nextjs
