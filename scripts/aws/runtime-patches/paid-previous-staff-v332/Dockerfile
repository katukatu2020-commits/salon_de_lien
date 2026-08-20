ARG BASE_IMAGE=salon-de-lien:paid-previous-staff-v331
FROM ${BASE_IMAGE}

USER root

COPY paid-previous-staff-v332/patch-runtime.mjs /tmp/paid-previous-staff-v332.mjs
COPY paid-previous-staff-v332/verify-runtime.mjs /tmp/verify-paid-previous-staff-v332.mjs

RUN node /tmp/paid-previous-staff-v332.mjs \
 && node /tmp/verify-paid-previous-staff-v332.mjs \
 && node --check /app/server.js

USER nextjs
