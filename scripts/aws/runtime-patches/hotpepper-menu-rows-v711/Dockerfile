ARG BASE_IMAGE=salon-de-lien:staff-work-shading-v710-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v711
RUN node /tmp/lien-v711/patch-runtime.cjs \
 && node --check /app/server.js \
 && node --check /app/hotpepper-menu-parser-v612.js \
 && node --test /tmp/lien-v711/parser.test.cjs \
 && node /tmp/lien-v711/verify-runtime.mjs
USER nextjs
