ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:17e1e2ca1b3cce863e6a9003d3d83d5dffcc03d2a445ff8c2725b8410b343d0c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v488/
RUN node --check /tmp/lien-v488/patch-runtime.mjs \
 && node --check /tmp/lien-v488/verify-runtime.mjs \
 && node --check /tmp/lien-v488/test-runtime.mjs \
 && node /tmp/lien-v488/patch-runtime.mjs \
 && node /tmp/lien-v488/verify-runtime.mjs \
 && node /tmp/lien-v488/test-runtime.mjs \
 && rm -rf /tmp/lien-v488

USER nextjs
