ARG BASE_IMAGE=salon-de-lien:navigation-loader-scope-v623-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v624/

RUN node --check /tmp/lien-v624/patch-runtime.mjs \
 && node --check /tmp/lien-v624/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v624/patch-runtime.mjs \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v624/verify-runtime.mjs

USER nextjs
