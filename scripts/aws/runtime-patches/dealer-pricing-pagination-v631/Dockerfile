ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v631/

RUN node --check /tmp/lien-v631/patch-runtime.mjs \
 && node --check /tmp/lien-v631/verify-runtime.mjs \
 && node --check /tmp/lien-v631/local-fixture.mjs \
 && node --check /tmp/lien-v631/browser-regression.mjs \
 && node --check /tmp/lien-v631/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v631/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v631/verify-runtime.mjs

USER nextjs
