ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v610/
RUN node /tmp/lien-v610/verify-runtime.mjs snapshot \
 && node /tmp/lien-v610/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/style-system-integration-v602.js \
 && node --check /app/style-community-controls-v610.js \
 && node --check /app/public/style-community-controls-v610.js \
 && node -e "require('/app/style-community-controls-v610.js')" \
 && node /tmp/lien-v610/verify-runtime.mjs
USER nextjs
