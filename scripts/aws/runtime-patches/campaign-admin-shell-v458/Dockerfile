ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d07e6ae9b48e248da98728a8159e53557fe62de9b5ff0e4f57d3733f0ae0055e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v458/
RUN node --check /tmp/lien-v458/patch-runtime.mjs \
 && node --check /tmp/lien-v458/verify-runtime.mjs \
 && node /tmp/lien-v458/patch-runtime.mjs \
 && node /tmp/lien-v458/verify-runtime.mjs \
 && rm -rf /tmp/lien-v458

USER nextjs
