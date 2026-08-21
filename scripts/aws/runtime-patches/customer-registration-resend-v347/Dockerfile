ARG BASE_IMAGE=salon-de-lien:customer-registration-resend-v346
FROM ${BASE_IMAGE}

USER root

COPY scripts/aws/runtime-patches/customer-registration-resend-v345/customer-registration-resend-v345.js /app/customer-registration-resend-v347.js
COPY scripts/aws/runtime-patches/customer-registration-resend-v347/patch-runtime.mjs /tmp/patch-customer-registration-resend-v347.mjs
COPY scripts/aws/runtime-patches/customer-registration-resend-v347/verify-runtime.mjs /tmp/verify-customer-registration-resend-v347.mjs

RUN node /tmp/patch-customer-registration-resend-v347.mjs \
 && node --check /app/customer-registration-resend-v347.js \
 && node --check /app/server.js \
 && node /tmp/verify-customer-registration-resend-v347.mjs

USER nextjs
