ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v607/
RUN node /tmp/lien-v607/verify-runtime.mjs snapshot \
 && node /tmp/lien-v607/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/lien-v607/verify-runtime.mjs
USER nextjs
