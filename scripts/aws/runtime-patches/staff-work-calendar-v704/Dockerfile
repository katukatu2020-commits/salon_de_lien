ARG BASE_IMAGE=salon-de-lien:hotpepper-menu-restore-v703-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v704
RUN node /tmp/lien-v704/patch-runtime.cjs \
 && node --check /app/staff-work-calendar-v704.cjs \
 && node /tmp/lien-v704/runtime-tests.cjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/tenant-setup.js \
 && node --check /app/appointment-operations-v267.js \
 && node --check /app/line-reservations-v436.js \
 && node --check /app/staff-breaks-checkout-menu-v442.js \
 && node --check /app/.next/server/app/admin/appointments/page.js
USER nextjs
