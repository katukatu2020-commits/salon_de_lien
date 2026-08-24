ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:e1e408d86607f8c163ee6b1b0d71f84f0330e659f7dacdcef11f33a1c2939e8c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v428/
RUN node --check /tmp/lien-v428/patch-runtime.mjs \
 && node /tmp/lien-v428/patch-runtime.mjs \
 && node /tmp/lien-v428/verify-runtime.mjs \
 && rm -rf /tmp/lien-v428

USER nextjs
