ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:141a5b8e95a2dd1584e6bc43eda18e7efab550925b899bf8bce86eb4c10500aa
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-staff-booking-v520.js patch-runtime.mjs test-policy.mjs verify-runtime.mjs /tmp/lien-v520/

RUN node --check /tmp/lien-v520/customer-staff-booking-v520.js \
 && node --check /tmp/lien-v520/patch-runtime.mjs \
 && node --check /tmp/lien-v520/test-policy.mjs \
 && node --check /tmp/lien-v520/verify-runtime.mjs \
 && node /tmp/lien-v520/test-policy.mjs \
 && cp /tmp/lien-v520/customer-staff-booking-v520.js /app/customer-staff-booking-v520.js \
 && node /tmp/lien-v520/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/tenant-setup.js \
 && node --check '/app/.next/server/app/u/(account)/appointments/page.js' \
 && node /tmp/lien-v520/verify-runtime.mjs \
 && rm -rf /tmp/lien-v520

USER nextjs
