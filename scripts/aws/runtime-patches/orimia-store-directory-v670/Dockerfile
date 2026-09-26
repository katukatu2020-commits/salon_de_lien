ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:1d5edf7bff1a1cc699aa8c3619a81adb5a49fc84fed59baafedb6f5e40a0bef5
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v670/

RUN node --check /tmp/lien-v670/orimia-store-directory-v670.js \
 && node --check /tmp/lien-v670/orimia-publication-client-v670.js \
 && node --check /tmp/lien-v670/patch-runtime.mjs \
 && node --check /tmp/lien-v670/verify-runtime.mjs \
 && node --check /tmp/lien-v670/integration.mjs \
 && node --check /tmp/lien-v670/browser-regression.mjs \
 && node --check /tmp/lien-v670/production-smoke.mjs \
 && node --check /tmp/lien-v670/production-browser.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v670/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v670/patch-runtime.mjs \
 && node --check /app/orimia-store-directory-v670.js \
 && node --check /app/customer-links-v293.js \
 && node --check /app/customer-link-ui-v293.js \
 && node --check /app/customer-link-ui-v424.js \
 && node --check /app/admin-staff-experience-v276.js \
 && node --check /app/store-profile.js \
 && node --check /app/customer-store-staff-v276.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v670/verify-runtime.mjs

USER nextjs
