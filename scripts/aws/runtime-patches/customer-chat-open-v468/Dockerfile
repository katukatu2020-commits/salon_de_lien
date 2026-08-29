ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:04d0b22efdb302ddacb94b2fb67c36c978de605d1abf7fbbaf30f6e47b94d257
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs smoke-production.mjs /tmp/lien-v468/
RUN node --check /tmp/lien-v468/patch-runtime.mjs \
 && node --check /tmp/lien-v468/verify-runtime.mjs \
 && node --check /tmp/lien-v468/test-runtime.mjs \
 && node --check /tmp/lien-v468/smoke-production.mjs \
 && node /tmp/lien-v468/patch-runtime.mjs \
 && node /tmp/lien-v468/verify-runtime.mjs \
 && node /tmp/lien-v468/test-runtime.mjs \
 && rm -rf /tmp/lien-v468

USER nextjs
