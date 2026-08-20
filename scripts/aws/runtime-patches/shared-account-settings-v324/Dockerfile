ARG BASE_IMAGE=salon-de-lien:attendance-notification-product-v323
FROM ${BASE_IMAGE}

COPY sales-ledger-accounts-v318/sales-ledger-accounts-v318.js /app/sales-ledger-accounts-v318.js
COPY sales-ledger-accounts-v318/sales-ledger-client-v318.js /app/sales-ledger-client-v318.js

RUN node --check /app/sales-ledger-accounts-v318.js \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/server.js
