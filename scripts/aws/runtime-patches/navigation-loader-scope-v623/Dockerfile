ARG BASE_IMAGE=salon-de-lien:auto-split-orders-v622-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs loader-scope-transform.mjs /tmp/lien-v623/

RUN node --check /tmp/lien-v623/patch-runtime.mjs \
 && node --check /tmp/lien-v623/verify-runtime.mjs \
 && node --check /tmp/lien-v623/loader-scope-transform.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v623/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/ui-transition-v623.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v623/verify-runtime.mjs

USER nextjs
