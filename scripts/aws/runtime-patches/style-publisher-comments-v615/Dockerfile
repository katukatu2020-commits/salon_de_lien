ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v615/
RUN node /tmp/lien-v615/verify-runtime.mjs snapshot \
 && node /tmp/lien-v615/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/content-edit-delete-client-v615.js \
 && node --check /app/.next/server/chunks/1425.js \
 && node --check /app/.next/server/chunks/2616.js \
 && node --check /app/.next/server/chunks/9542.js \
 && node /tmp/lien-v615/verify-runtime.mjs
USER nextjs
