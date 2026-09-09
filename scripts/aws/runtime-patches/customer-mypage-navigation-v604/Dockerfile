ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v604/
RUN node /tmp/lien-v604/verify-runtime.mjs snapshot \
 && node /tmp/lien-v604/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/customer-journey-v601.js \
 && node /tmp/lien-v604/verify-runtime.mjs
USER nextjs
