ARG BASE_IMAGE=salon-de-lien:appointment-staff-schema-v351
FROM ${BASE_IMAGE}

USER root

COPY scripts/aws/runtime-patches/customer-card-store-profile-v352/patch-runtime.mjs /tmp/patch-customer-card-store-profile-v352.mjs
COPY scripts/aws/runtime-patches/customer-card-store-profile-v352/verify-runtime.mjs /tmp/verify-customer-card-store-profile-v352.mjs

RUN node /tmp/patch-customer-card-store-profile-v352.mjs \
 && node --check /app/store-profile.js \
 && node /tmp/verify-customer-card-store-profile-v352.mjs

USER nextjs
