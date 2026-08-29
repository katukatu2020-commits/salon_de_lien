ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:012e264fab47699bd684e3e9f153f40ad5d970f19d61588cf3d7f8c64c6dddd9
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-store-staff-v276.js /app/customer-store-staff-v276.js
COPY customer-campaigns-v427.js /app/customer-campaigns-v427.js
COPY patch-runtime.mjs verify-runtime.mjs smoke-production.mjs test-runtime.mjs /tmp/lien-v462/
RUN node --check /app/customer-store-staff-v276.js \
 && node --check /app/customer-campaigns-v427.js \
 && node --check /tmp/lien-v462/patch-runtime.mjs \
 && node --check /tmp/lien-v462/verify-runtime.mjs \
 && node --check /tmp/lien-v462/smoke-production.mjs \
 && node --check /tmp/lien-v462/test-runtime.mjs \
 && node /tmp/lien-v462/patch-runtime.mjs \
 && node /tmp/lien-v462/verify-runtime.mjs \
 && node /tmp/lien-v462/test-runtime.mjs \
 && rm -rf /tmp/lien-v462

USER nextjs
