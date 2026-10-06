ARG BASE_IMAGE=salon-de-lien:dealer-order-flow-v698-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v700
COPY --from=checkout-client checkout-shift-v700.js /app/public/checkout-shift-v700.js
RUN node /tmp/lien-v700/patch-runtime.cjs \
    && node --check /app/public/checkout-shift-v700.js \
    && node --check /app/public/receipt-pos-direct-v700.js \
    && node --check /app/.next/static/chunks/app/admin/appointments/page-checkout-shift-v700.js \
    && node --check /app/server.js
USER nextjs
RUN node /tmp/lien-v700/verify-runtime.mjs
