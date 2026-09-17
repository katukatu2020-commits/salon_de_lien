ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v654/

RUN node --check /tmp/lien-v654/customer-store-unlink-v654.js \
 && node --check /tmp/lien-v654/patch-runtime.mjs \
 && node --check /tmp/lien-v654/verify-runtime.mjs \
 && node --check /tmp/lien-v654/integration.mjs \
 && node --check /tmp/lien-v654/browser-regression.mjs \
 && node --check /tmp/lien-v654/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v654/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v654/patch-runtime.mjs \
 && node --check /app/customer-store-unlink-v654.js \
 && node --check /app/customer-links-v293.js \
 && node --check /app/customer-link-ui-v293.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v654/verify-runtime.mjs

USER nextjs
