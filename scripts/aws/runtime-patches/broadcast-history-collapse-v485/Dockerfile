ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:f37a2deb7aacaad45a10a87e6be960de11e2449873df406d053f5add046a091e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v485/
RUN node --check /tmp/lien-v485/patch-runtime.mjs \
 && node --check /tmp/lien-v485/verify-runtime.mjs \
 && node --check /tmp/lien-v485/test-runtime.mjs \
 && node /tmp/lien-v485/patch-runtime.mjs \
 && node /tmp/lien-v485/verify-runtime.mjs \
 && node /tmp/lien-v485/test-runtime.mjs \
 && rm -rf /tmp/lien-v485

USER nextjs
