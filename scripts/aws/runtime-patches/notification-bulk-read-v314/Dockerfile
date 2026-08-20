ARG BASE_IMAGE
FROM ${BASE_IMAGE}

COPY patch-runtime.mjs /tmp/patch-runtime.mjs
COPY verify-runtime.cjs /tmp/verify-runtime.cjs

RUN node /tmp/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node /tmp/verify-runtime.cjs
