ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v652/

RUN node --check /tmp/lien-v652/customer-booking-points-v652.js \
 && node --check /tmp/lien-v652/customer-booking-points-v652-client.js \
 && node --check /tmp/lien-v652/ui-workflows-booking-v652.js \
 && node --check /tmp/lien-v652/patch-runtime.mjs \
 && node --check /tmp/lien-v652/verify-runtime.mjs \
 && node --check /tmp/lien-v652/integration.mjs \
 && node --check /tmp/lien-v652/browser-regression.mjs \
 && node --check /tmp/lien-v652/production-smoke.mjs \
 && node --check /tmp/lien-v652/production-browser.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v652/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v652/patch-runtime.mjs \
 && node --check /app/customer-booking-points-v652.js \
 && node --check /app/public/customer-booking-points-v652.js \
 && node --check /app/ui-workflows-v294.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v652/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v652/integration.mjs

USER nextjs
