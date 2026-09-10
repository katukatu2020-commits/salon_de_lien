ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v617/
RUN node /tmp/lien-v617/verify-runtime.mjs snapshot \
 && node /tmp/lien-v617/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/lien-v617/verify-runtime.mjs
USER nextjs
