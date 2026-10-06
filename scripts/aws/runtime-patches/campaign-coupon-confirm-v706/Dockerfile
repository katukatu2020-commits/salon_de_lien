ARG BASE_IMAGE=salon-de-lien:bulk-booking-capacity-v705-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v706
RUN node /tmp/lien-v706/patch-runtime.cjs \
 && node --check /app/customer-link-ui-v293.js \
 && node --check /app/customer-campaigns-v427.js \
 && node --check /app/.next/server/chunks/9845.js \
 && node --check /app/server.js \
 && node /tmp/lien-v706/verify-runtime.mjs \
 && node --test /tmp/lien-v706/audience.test.cjs \
 && node /tmp/lien-v706/image.test.cjs
USER nextjs
