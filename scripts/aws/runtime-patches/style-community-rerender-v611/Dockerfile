ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v611/
RUN node /tmp/lien-v611/verify-runtime.mjs snapshot \
 && node /tmp/lien-v611/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/style-community-controls-v610.js \
 && node /tmp/lien-v611/verify-runtime.mjs
USER nextjs
