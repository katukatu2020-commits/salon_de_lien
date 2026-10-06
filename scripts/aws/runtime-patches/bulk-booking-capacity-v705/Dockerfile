ARG BASE_IMAGE=salon-de-lien:staff-work-calendar-v704-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v705
RUN node /tmp/lien-v705/patch-runtime.cjs \
 && node --check /app/bulk-booking-capacity-v705.cjs \
 && node --check /app/server.js \
 && node --check /app/tenant-setup.js \
 && node --check /app/tenant-setup-client.js \
 && node --check /app/.next/server/app/admin/appointments/page.js \
 && node --check /app/.next/static/chunks/app/admin/appointments/page-checkout-shift-v700.capacity-v705.js \
 && node /tmp/lien-v705/runtime-tests.cjs \
 && node /tmp/lien-v705/verify-runtime.mjs
USER nextjs
