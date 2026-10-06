ARG BASE_IMAGE=salon-de-lien:customer-kana-search-v707-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v708
RUN node /tmp/lien-v708/patch-runtime.cjs \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/customer-appointment-history-v565.js \
 && node --check /app/.next/server/chunks/3244.js \
 && node --check /app/server.js \
 && node /tmp/lien-v708/verify-runtime.mjs \
 && node --test /tmp/lien-v708/security.test.cjs
USER nextjs
