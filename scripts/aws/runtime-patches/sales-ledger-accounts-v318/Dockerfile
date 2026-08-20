ARG BASE_IMAGE
FROM ${BASE_IMAGE}

COPY sales-ledger-accounts-v318.js /app/sales-ledger-accounts-v318.js
COPY sales-ledger-client-v318.js /app/sales-ledger-client-v318.js
COPY patch-runtime.mjs /tmp/patch-runtime.mjs
COPY verify-runtime.cjs /tmp/verify-runtime.cjs

RUN node /tmp/patch-runtime.mjs \
 && node --check /app/sales-ledger-accounts-v318.js \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/server.js \
 && node --check /app/billing.js \
 && node --check /app/platform-operator.js \
 && node --check /app/tenant-setup-client.js \
 && node /tmp/verify-runtime.cjs
