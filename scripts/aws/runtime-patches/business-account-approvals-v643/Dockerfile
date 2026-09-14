ARG BASE_IMAGE=salon-de-lien:customer-store-limit-v642-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs integration.mjs browser-regression.mjs production-smoke.mjs /tmp/lien-v643/
RUN node --check /tmp/lien-v643/patch-runtime.mjs \
 && node --check /tmp/lien-v643/verify-runtime.mjs \
 && node --check /tmp/lien-v643/integration.mjs \
 && node --check /tmp/lien-v643/browser-regression.mjs \
 && node --check /tmp/lien-v643/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v643/verify-runtime.mjs snapshot

COPY business-account-approvals-v643.js ./

RUN LIEN_RUNTIME_ROOT=/app node /tmp/lien-v643/patch-runtime.mjs \
 && node --check /app/business-account-approvals-v643.js \
 && node --check /app/platform-operator.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/managed-account-access-v629.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v643/verify-runtime.mjs

USER nextjs
