ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:39eb157d0e3f04e446cf30b69ef9de22da63295e0f7823c795ac5d07ec52bf52
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v457/
RUN node --check /tmp/lien-v457/patch-runtime.mjs \
 && node --check /tmp/lien-v457/verify-runtime.mjs \
 && node /tmp/lien-v457/patch-runtime.mjs \
 && node /tmp/lien-v457/verify-runtime.mjs \
 && rm -rf /tmp/lien-v457

USER nextjs
