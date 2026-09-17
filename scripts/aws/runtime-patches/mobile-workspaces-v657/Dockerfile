ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:aa3e916f34de3fae7ee2277b351cc0fa0cb61f2529a93bfddc869bbde6aa431b
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v657/

RUN node --check /tmp/lien-v657/patch-runtime.mjs \
 && node --check /tmp/lien-v657/verify-runtime.mjs \
 && node --check /tmp/lien-v657/mobile-workspaces-v657.js \
 && node --check /tmp/lien-v657/browser-regression.mjs \
 && node --check /tmp/lien-v657/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v657/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v657/patch-runtime.mjs \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v657/verify-runtime.mjs

USER nextjs
