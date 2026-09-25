ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c31899381a2aa8d22092ab091092bcca8fe25944a400328c692b2ec1fd2c0dc7
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v664/

RUN node --check /tmp/lien-v664/runtime-transform.mjs \
 && node --check /tmp/lien-v664/patch-runtime.mjs \
 && node --check /tmp/lien-v664/verify-runtime.mjs \
 && node --check /tmp/lien-v664/test-runtime.mjs \
 && node --check /tmp/lien-v664/browser-regression.mjs \
 && node --check /tmp/lien-v664/production-smoke.mjs \
 && node --check /tmp/lien-v664/integration-browser-regression.mjs \
 && node /tmp/lien-v664/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v664/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v664/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-campaigns-v427.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v664/verify-runtime.mjs

USER nextjs
