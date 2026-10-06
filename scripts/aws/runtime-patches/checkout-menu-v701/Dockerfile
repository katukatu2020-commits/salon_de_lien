ARG BASE_IMAGE=salon-de-lien:checkout-shift-v700-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v701
COPY --from=appointment-helpers reservation-menu.cjs /app/reservation-menu-v701.cjs
RUN node /tmp/lien-v701/patch-runtime.cjs \
    && node --check /app/tenant-setup.js \
    && node --check /app/inbound-email.js \
    && node --check /app/staff-breaks-checkout-menu-client-v442.js \
    && node --check /app/.next/server/app/admin/appointments/\[appointmentId\]/page.js \
    && node --check /app/server.js
USER nextjs
