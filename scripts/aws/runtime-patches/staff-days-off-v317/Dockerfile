ARG BASE_IMAGE
FROM ${BASE_IMAGE}

COPY patch-runtime.mjs /tmp/patch-runtime.mjs
COPY verify-runtime.cjs /tmp/verify-runtime.cjs

RUN node /tmp/patch-runtime.mjs \
 && node --check /app/customer-store-staff-v276.js \
 && node --check /app/admin-staff-experience-v276.js \
 && node --check /app/tenant-setup.js \
 && node --check /app/tenant-setup-client.js \
 && node --check /app/server.js \
 && node /tmp/verify-runtime.cjs
