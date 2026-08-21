ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
COPY patch-runtime.mjs /tmp/patch-runtime.mjs
COPY verify-runtime.mjs /tmp/verify-runtime.mjs
RUN node /tmp/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/verify-runtime.mjs
USER nextjs
