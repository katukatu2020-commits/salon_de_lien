ARG BASE_IMAGE=salon-de-lien:style-detail-management-removal-v626-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY password-visibility-v627.js password-visibility-v627.css ./public/
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v627/

RUN node --check /app/public/password-visibility-v627.js \
 && node --check /tmp/lien-v627/patch-runtime.mjs \
 && node --check /tmp/lien-v627/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v627/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/wholesale-ordering-v543.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v627/verify-runtime.mjs

USER nextjs
