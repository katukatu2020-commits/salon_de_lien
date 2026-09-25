ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b6ef0a795779e06414fc0b7f3fee3d8ec0a9f46054d957d00a39a943a856a588
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v665/
COPY customer-coupon-menu-prefill-v665.js /app/public/customer-coupon-menu-prefill-v665.js

RUN node --check /tmp/lien-v665/runtime-transform.mjs \
 && node --check /tmp/lien-v665/patch-runtime.mjs \
 && node --check /tmp/lien-v665/verify-runtime.mjs \
 && node --check /tmp/lien-v665/test-runtime.mjs \
 && node --check /tmp/lien-v665/browser-regression.mjs \
 && node --check /tmp/lien-v665/production-smoke.mjs \
 && node --check /tmp/lien-v665/integration-browser-regression.mjs \
 && node --check /app/public/customer-coupon-menu-prefill-v665.js \
 && node /tmp/lien-v665/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v665/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v665/patch-runtime.mjs \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v665/verify-runtime.mjs

USER nextjs
