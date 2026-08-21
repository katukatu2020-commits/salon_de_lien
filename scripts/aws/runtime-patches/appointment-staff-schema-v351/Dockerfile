ARG BASE_IMAGE=salon-de-lien:attendance-multi-shift-v350
FROM ${BASE_IMAGE}

USER root

COPY scripts/aws/runtime-patches/appointment-staff-schema-v351/patch-runtime.mjs /tmp/patch-appointment-staff-schema-v351.mjs
COPY scripts/aws/runtime-patches/appointment-staff-schema-v351/verify-runtime.mjs /tmp/verify-appointment-staff-schema-v351.mjs

RUN node /tmp/patch-appointment-staff-schema-v351.mjs \
 && node --check /app/appointment-operations-v267.js \
 && node /tmp/verify-appointment-staff-schema-v351.mjs

USER nextjs
