ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v618/
RUN node /tmp/lien-v618/verify-runtime.mjs snapshot \
 && node /tmp/lien-v618/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/style-community-controls-v610.js \
 && node --check /app/public/style-community-controls-v610.js \
 && node --check /app/style-admin-controls-v618.js \
 && node --check /app/public/style-admin-controls-v618.js \
 && node -e "require('/app/style-admin-controls-v618.js')" \
 && node /tmp/lien-v618/verify-runtime.mjs
USER nextjs
