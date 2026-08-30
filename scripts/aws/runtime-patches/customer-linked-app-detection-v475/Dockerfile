ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b97d2974090c61cfdbef3578cc646fb178821b118ffe7a3ebc239d3babca6f16
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v475/
RUN node --check /tmp/lien-v475/patch-runtime.mjs \
 && node --check /tmp/lien-v475/verify-runtime.mjs \
 && node --check /tmp/lien-v475/test-runtime.mjs \
 && node /tmp/lien-v475/patch-runtime.mjs \
 && node /tmp/lien-v475/verify-runtime.mjs \
 && node /tmp/lien-v475/test-runtime.mjs \
 && rm -rf /tmp/lien-v475

USER nextjs
