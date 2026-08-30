ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b1b29488f451e680ac1221ca9e2041b81dbf7b9f98d0d7ac6d6cbde3f50e5f59
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-edit-delete-client-v480.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v480/
RUN node --check /tmp/lien-v480/content-edit-delete-client-v480.js \
 && node --check /tmp/lien-v480/patch-runtime.mjs \
 && node --check /tmp/lien-v480/verify-runtime.mjs \
 && node --check /tmp/lien-v480/test-runtime.mjs \
 && node /tmp/lien-v480/patch-runtime.mjs \
 && node /tmp/lien-v480/verify-runtime.mjs \
 && node /tmp/lien-v480/test-runtime.mjs \
 && rm -rf /tmp/lien-v480

USER nextjs
