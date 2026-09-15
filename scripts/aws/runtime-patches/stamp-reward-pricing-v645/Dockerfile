ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v645/

RUN node --check /tmp/lien-v645/patch-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v645/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/customer-booking-confirmation-v616.js \
 && node --check /app/ui-workflows-v294.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v645/verify-runtime.mjs

USER nextjs
