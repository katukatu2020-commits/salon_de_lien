ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v603/
RUN node /tmp/lien-v603/verify-runtime.mjs snapshot \
 && node /tmp/lien-v603/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/stamp-program-v603.js \
 && node --check /app/stamp-program-v603.js \
 && node /tmp/lien-v603/verify-runtime.mjs
USER nextjs
