ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v602/
RUN node /tmp/lien-v602/verify-runtime.mjs snapshot \
 && node /tmp/lien-v602/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/community-publishing-v566.js \
 && node --check /app/public/style-system-integration-v602.js \
 && node --check /app/style-system-integration-v602.js \
 && node /tmp/lien-v602/verify-runtime.mjs
USER nextjs
