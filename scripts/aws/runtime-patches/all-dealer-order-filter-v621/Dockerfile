ARG BASE_IMAGE=salon-de-lien:dealer-code-history-v620-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v621/

RUN node --check /tmp/lien-v621/patch-runtime.mjs \
 && node --check /tmp/lien-v621/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v621/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /app/public/inventory-orders-common-layout-v572.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v621/verify-runtime.mjs

USER nextjs
