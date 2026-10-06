ARG BASE_IMAGE=salon-de-lien:staff-break-drag-v702-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v703
RUN node /tmp/lien-v703/patch-runtime.cjs \
    && node --check /app/public/hotpepper-menu-import-v703.js \
    && node --check /app/server.js
USER nextjs
