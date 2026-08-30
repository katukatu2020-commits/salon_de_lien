ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:4711535be1eb0f95184760e9cceab62e730dc634a94a1e10bd6020db0d1bc2e7
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v476/
RUN node --check /tmp/lien-v476/patch-runtime.mjs \
 && node --check /tmp/lien-v476/verify-runtime.mjs \
 && node --check /tmp/lien-v476/test-runtime.mjs \
 && node /tmp/lien-v476/patch-runtime.mjs \
 && node /tmp/lien-v476/verify-runtime.mjs \
 && node /tmp/lien-v476/test-runtime.mjs \
 && rm -rf /tmp/lien-v476

USER nextjs
