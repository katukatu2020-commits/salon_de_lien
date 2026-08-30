ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:e0e4fc72a74c89c8cd3641c44d3540b9d22e9fe319cf568ded5545318a9fb3a3
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-edit-delete-client-v490.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v490/
RUN node --check /tmp/lien-v490/content-edit-delete-client-v490.js \
 && node --check /tmp/lien-v490/patch-runtime.mjs \
 && node --check /tmp/lien-v490/verify-runtime.mjs \
 && node --check /tmp/lien-v490/test-runtime.mjs \
 && node /tmp/lien-v490/patch-runtime.mjs \
 && node /tmp/lien-v490/verify-runtime.mjs \
 && LIEN_STYLE_BACK_CLIENT=/app/public/content-edit-delete-client-v490.js node /tmp/lien-v490/test-runtime.mjs \
 && rm -rf /tmp/lien-v490

USER nextjs
