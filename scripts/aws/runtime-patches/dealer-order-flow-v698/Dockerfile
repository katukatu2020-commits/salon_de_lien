ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v698/
COPY --from=migrations migration.sql /tmp/lien-v698/migration.sql
RUN node /tmp/lien-v698/patch-runtime.cjs && node --check /app/dealer-erp-v678.js && node --check /app/wholesale-ordering-v543.js && node --check /app/server.js
USER nextjs
