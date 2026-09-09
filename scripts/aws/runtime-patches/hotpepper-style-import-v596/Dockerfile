ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:943c578bb6f6876a35a00237092e33a613ccb75eabff20b6c7c4956e399a6ca5
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY package.json package-lock.json /app/hotpepper-deps/
RUN npm ci --prefix /app/hotpepper-deps --omit=dev --ignore-scripts --no-audit --no-fund
COPY hotpepper-parser-v596.js hotpepper-import-v596.js style-metadata-v596.js ./
COPY patch-runtime.mjs verify-runtime.mjs publisher-addon-v596.js metadata-client-v596.js integration.mjs /tmp/lien-v596/
RUN node /tmp/lien-v596/verify-runtime.mjs snapshot \
 && node /tmp/lien-v596/patch-runtime.mjs \
 && node --check community-publishing-v566.js \
 && node --check community-publishing-client-v566.js \
 && node --check content-management-v465.js \
 && node --check public/content-edit-delete-client-v560.js \
 && node --check hotpepper-parser-v596.js \
 && node --check hotpepper-import-v596.js \
 && node --check server.js \
 && node /tmp/lien-v596/verify-runtime.mjs
USER nextjs
