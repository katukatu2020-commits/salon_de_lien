ARG BASE_IMAGE=salon-de-lien:style-admin-rerender-v619-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v620/

RUN node --check /tmp/lien-v620/patch-runtime.mjs \
 && node --check /tmp/lien-v620/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v620/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /app/public/inventory-orders-common-layout-v572.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v620/verify-runtime.mjs

USER nextjs
