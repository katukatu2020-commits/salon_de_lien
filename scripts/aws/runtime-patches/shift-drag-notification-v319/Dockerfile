ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root

COPY patch-runtime.mjs /tmp/patch-runtime.mjs
COPY verify-runtime.cjs /tmp/verify-runtime.cjs

RUN node /tmp/patch-runtime.mjs \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/server.js \
 && node /tmp/verify-runtime.cjs

USER nextjs
