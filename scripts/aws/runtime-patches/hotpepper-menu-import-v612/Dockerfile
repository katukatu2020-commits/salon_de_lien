ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v612/
RUN node /tmp/lien-v612/verify-runtime.mjs snapshot \
 && node /tmp/lien-v612/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/hotpepper-menu-parser-v612.js \
 && node --check /app/hotpepper-menu-import-v612.js \
 && node --check /app/public/hotpepper-menu-import-v612.js \
 && node /tmp/lien-v612/verify-runtime.mjs \
 && node /tmp/lien-v612/integration.mjs
USER nextjs
