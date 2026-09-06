ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:e304e400e1ddbf70af6ca36d4eecbff8c29c74f6236ca71131aa5f63be0bd4e8
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-edit-delete-client-v557.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs test-patch.mjs /tmp/lien-v557/

RUN node --check /tmp/lien-v557/content-edit-delete-client-v557.js \
 && node --check /tmp/lien-v557/patch-runtime.mjs \
 && node --check /tmp/lien-v557/verify-runtime.mjs \
 && node --check /tmp/lien-v557/test-runtime.mjs \
 && node --check /tmp/lien-v557/test-patch.mjs \
 && node /tmp/lien-v557/test-runtime.mjs \
 && node /tmp/lien-v557/test-patch.mjs \
 && node /tmp/lien-v557/patch-runtime.mjs \
 && node --check /app/public/content-edit-delete-client-v557.js \
 && node --check /app/server.js \
 && node /tmp/lien-v557/verify-runtime.mjs \
 && rm -rf /tmp/lien-v557

USER nextjs
