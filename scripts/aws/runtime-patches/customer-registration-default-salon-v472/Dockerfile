ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:f627185cce5a424b8f8c6e72ab4657e11a9dc5fe18f901429c5f5c0d27227414
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v472/
RUN node --check /tmp/lien-v472/patch-runtime.mjs \
 && node --check /tmp/lien-v472/verify-runtime.mjs \
 && node /tmp/lien-v472/patch-runtime.mjs \
 && node /tmp/lien-v472/verify-runtime.mjs \
 && rm -rf /tmp/lien-v472

USER nextjs
