ARG BASE_IMAGE=salon-de-lien:search-input-stability-v641-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs integration.mjs browser-regression.mjs production-smoke.mjs stores-v642.fragment.js stores-page-v642.fragment.js store-client-v642.fragment.js /tmp/lien-v642/
RUN node --check /tmp/lien-v642/patch-runtime.mjs \
 && node --check /tmp/lien-v642/verify-runtime.mjs \
 && node --check /tmp/lien-v642/integration.mjs \
 && node --check /tmp/lien-v642/browser-regression.mjs \
 && node --check /tmp/lien-v642/production-smoke.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v642/verify-runtime.mjs snapshot

COPY customer-store-membership-v642.js ./

RUN LIEN_RUNTIME_ROOT=/app node /tmp/lien-v642/patch-runtime.mjs \
 && node --check /app/customer-links-v293.js \
 && node --check /app/customer-link-ui-v293.js \
 && node --check /app/customer-store-membership-v642.js \
 && node --check /app/customer-runtime-v267.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v642/verify-runtime.mjs

USER nextjs
