ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ca895e7fa8c2f78835f89246deb401c4ca6447256c0bb23e01f9faad98f38ed7
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs orimia-brand-v503.js store-platform-v503.js /tmp/store-platform-v503/
RUN node --check /tmp/store-platform-v503/patch-runtime.mjs \
 && node --check /tmp/store-platform-v503/verify-runtime.mjs \
 && node --check /tmp/store-platform-v503/orimia-brand-v503.js \
 && node --check /tmp/store-platform-v503/store-platform-v503.js \
 && node /tmp/store-platform-v503/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-profile-image-service-v424.js \
 && node --check /app/store-profile.js \
 && node --check /app/.next/server/chunks/7295.js \
 && node --check /app/.next/static/chunks/app/layout-runtime-v503-final.js \
 && node --check /app/.next/static/chunks/app/layout-d1470003e928b0b1.customertabs-v503.js \
 && node --check /app/customer-experience-v503.js \
 && node --check '/app/.next/static/chunks/app/admin/appointments/[appointmentId]/page-4198cf4ea5eaf395.quantity-v503-final.js' \
 && node /tmp/store-platform-v503/verify-runtime.mjs \
 && rm -rf /tmp/store-platform-v503

USER nextjs
