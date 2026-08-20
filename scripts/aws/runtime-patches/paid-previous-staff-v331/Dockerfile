ARG BASE_IMAGE=salon-de-lien:stylist-auto-coupon-v330
FROM ${BASE_IMAGE}

USER root

COPY paid-previous-staff-v331/patch-runtime.mjs /tmp/paid-previous-staff-v331.mjs
COPY paid-previous-staff-v331/verify-runtime.mjs /tmp/verify-paid-previous-staff-v331.mjs

RUN node /tmp/paid-previous-staff-v331.mjs \
 && node /tmp/verify-paid-previous-staff-v331.mjs \
 && node --check /app/server.js

USER nextjs
