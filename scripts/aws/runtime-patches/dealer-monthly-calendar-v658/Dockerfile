ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c90fa04b7f6d2b4aa2c5ff9257d54b5c2ceab6c1add3a9378924931a5ce55806
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v658/

RUN node --check /tmp/lien-v658/patch-runtime.mjs \
 && node --check /tmp/lien-v658/verify-runtime.mjs \
 && node --check /tmp/lien-v658/dealer-calendar-server.fragment.js \
 && node --check /tmp/lien-v658/dealer-calendar-client.fragment.js \
 && node --check /tmp/lien-v658/service-regression.mjs \
 && node --check /tmp/lien-v658/browser-regression.mjs \
 && node --check /tmp/lien-v658/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v658/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v658/patch-runtime.mjs \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v658/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v658/service-regression.mjs

USER nextjs
