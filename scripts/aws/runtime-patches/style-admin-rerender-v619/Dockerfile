ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v619/
RUN node /tmp/lien-v619/verify-runtime.mjs snapshot \
 && node /tmp/lien-v619/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/style-admin-controls-v618.js \
 && node /tmp/lien-v619/verify-runtime.mjs
USER nextjs
