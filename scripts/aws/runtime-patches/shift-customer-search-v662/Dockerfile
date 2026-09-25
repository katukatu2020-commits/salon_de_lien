ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:343d442cace9057b5c72133a25c7f8a630199180ef138e5a12093faee408cbba
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v662/

RUN node --check /tmp/lien-v662/customer-search-v662.js \
 && node --check /tmp/lien-v662/patch-runtime.mjs \
 && node --check /tmp/lien-v662/verify-runtime.mjs \
 && node --check /tmp/lien-v662/browser-regression.mjs \
 && node --check /tmp/lien-v662/production-smoke.mjs \
 && node --check /tmp/lien-v662/integration-browser-regression.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v662/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v662/patch-runtime.mjs \
 && node --check /app/staff-breaks-checkout-menu-client-v442.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v662/verify-runtime.mjs

USER nextjs
