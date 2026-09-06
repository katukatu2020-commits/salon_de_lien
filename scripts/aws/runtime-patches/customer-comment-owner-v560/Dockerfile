ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:967ea9a60d955b18de2516bf4d4763969434bf9c9c3f5237c8df6ed32d908358
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-edit-delete-client-v560.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs test-patch.mjs /tmp/lien-v560/

RUN node --check /tmp/lien-v560/content-edit-delete-client-v560.js \
 && node --check /tmp/lien-v560/patch-runtime.mjs \
 && node --check /tmp/lien-v560/verify-runtime.mjs \
 && node --check /tmp/lien-v560/test-runtime.mjs \
 && node --check /tmp/lien-v560/test-patch.mjs \
 && node /tmp/lien-v560/test-runtime.mjs \
 && node /tmp/lien-v560/test-patch.mjs \
 && node /tmp/lien-v560/patch-runtime.mjs \
 && node --check /app/public/content-edit-delete-client-v560.js \
 && node --check /app/server.js \
 && node /tmp/lien-v560/verify-runtime.mjs \
 && rm -rf /tmp/lien-v560

USER nextjs
