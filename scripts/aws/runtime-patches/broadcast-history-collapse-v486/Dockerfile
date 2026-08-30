ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:3ad74f8dee25f0da6fbf7e047d40ceea3ca023d2daeeb158f038099211fb8722
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v486/
RUN node --check /tmp/lien-v486/patch-runtime.mjs \
 && node --check /tmp/lien-v486/verify-runtime.mjs \
 && node --check /tmp/lien-v486/test-runtime.mjs \
 && node /tmp/lien-v486/patch-runtime.mjs \
 && node /tmp/lien-v486/verify-runtime.mjs \
 && node /tmp/lien-v486/test-runtime.mjs \
 && rm -rf /tmp/lien-v486

USER nextjs
