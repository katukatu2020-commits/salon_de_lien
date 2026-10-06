ARG BASE_IMAGE=salon-de-lien:checkout-menu-v701-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v702
RUN node /tmp/lien-v702/patch-runtime.cjs \
    && node --check /app/staff-breaks-checkout-menu-client-v442.js \
    && node --check /app/public/appointment-datetime-v684.js \
    && node --check /app/server.js
USER nextjs
