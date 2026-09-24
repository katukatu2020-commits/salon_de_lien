ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:021913bde7fae2dc3af1b336593bcb3711cc93482ccec8fd0250f5db2075c1a3
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v659/

RUN node --check /tmp/lien-v659/patch-runtime.mjs \
 && node --check /tmp/lien-v659/verify-runtime.mjs \
 && node --check /tmp/lien-v659/dealer-bootstrap-v659.fragment.js \
 && node --check /tmp/lien-v659/dealer-products-v659.fragment.js \
 && node --check /tmp/lien-v659/dealer-pricing-v659.fragment.js \
 && node --check /tmp/lien-v659/dealer-change-v659.fragment.js \
 && node --check /tmp/lien-v659/dealer-bulk-pricing-v659.fragment.js \
 && node --check /tmp/lien-v659/service-regression.mjs \
 && node --check /tmp/lien-v659/browser-regression.mjs \
 && node --check /tmp/lien-v659/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v659/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v659/patch-runtime.mjs \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v659/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v659/service-regression.mjs

USER nextjs
