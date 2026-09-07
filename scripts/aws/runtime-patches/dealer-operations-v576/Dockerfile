ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ff81edd58cc1b829d29458c3256fb3eae476007dec3b4db9d46cfd1c6c36fe6a
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY wholesale-ordering-v543.js wholesale-ordering-client-v543.js wholesale-ordering-v543.css /app/
COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v576/

RUN node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /tmp/lien-v576/patch-runtime.mjs \
 && node --check /tmp/lien-v576/verify-runtime.mjs \
 && node --check /tmp/lien-v576/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v576/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v576/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/inventory-orders-common-layout-v572.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v576/verify-runtime.mjs \
 && rm -rf /tmp/lien-v576

USER nextjs
