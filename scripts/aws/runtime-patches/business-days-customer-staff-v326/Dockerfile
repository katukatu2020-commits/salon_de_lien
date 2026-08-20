ARG BASE_IMAGE=salon-de-lien:shift-drag-fluid-v325
FROM ${BASE_IMAGE}

USER root

COPY business-days-customer-staff-v326/patch-runtime.mjs /tmp/business-days-customer-staff-v326.mjs
COPY business-days-customer-staff-v326/verify-runtime.mjs /tmp/verify-business-days-customer-staff-v326.mjs

RUN node /tmp/business-days-customer-staff-v326.mjs \
 && node /tmp/verify-business-days-customer-staff-v326.mjs \
 && node --check /app/server.js

USER nextjs
