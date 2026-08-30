ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:117aba79c7daaf6f8dd86e6be979d3a4c483aa1e4860e8a662f7addef8588e9d
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-edit-delete-client-v481.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v481/
RUN node --check /tmp/lien-v481/content-edit-delete-client-v481.js \
 && node --check /tmp/lien-v481/patch-runtime.mjs \
 && node --check /tmp/lien-v481/verify-runtime.mjs \
 && node --check /tmp/lien-v481/test-runtime.mjs \
 && node /tmp/lien-v481/patch-runtime.mjs \
 && node /tmp/lien-v481/verify-runtime.mjs \
 && node /tmp/lien-v481/test-runtime.mjs \
 && rm -rf /tmp/lien-v481

USER nextjs
