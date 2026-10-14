ARG BASE_IMAGE=salon-de-lien:hotpepper-menu-rows-v711-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v712
RUN node /tmp/lien-v712/patch-runtime.cjs \
 && node --check /app/server.js \
 && node /tmp/lien-v712/verify-runtime.mjs
USER nextjs
