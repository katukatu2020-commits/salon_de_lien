ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b09a5195d82ffa450cf53b245191cd072f03a7276b5ae8ea5bea3f9d7e6f507f
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-edit-delete-client-v479.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v479/
RUN node --check /tmp/lien-v479/content-edit-delete-client-v479.js \
 && node --check /tmp/lien-v479/patch-runtime.mjs \
 && node --check /tmp/lien-v479/verify-runtime.mjs \
 && node --check /tmp/lien-v479/test-runtime.mjs \
 && node /tmp/lien-v479/patch-runtime.mjs \
 && node /tmp/lien-v479/verify-runtime.mjs \
 && node /tmp/lien-v479/test-runtime.mjs \
 && rm -rf /tmp/lien-v479

USER nextjs
