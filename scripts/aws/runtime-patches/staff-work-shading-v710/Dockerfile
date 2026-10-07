ARG BASE_IMAGE=salon-de-lien:dealer-product-master-v709-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v710
RUN node /tmp/lien-v710/patch-runtime.cjs \
 && node --check /app/server.js \
 && node --check /app/.next/server/app/admin/appointments/page.js \
 && node --check /app/.next/static/chunks/app/admin/appointments/page-staff-work-shading-v710.js \
 && node /tmp/lien-v710/verify-runtime.mjs \
 && node --test /tmp/lien-v710/shading.test.cjs
USER nextjs
