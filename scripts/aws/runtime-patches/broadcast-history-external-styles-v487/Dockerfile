ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:f263e4d67f82ad606c5029eeecf7aa0c9efa2413533be1dfe34dfdd92faa3856
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v487/
RUN node --check /tmp/lien-v487/patch-runtime.mjs \
 && node --check /tmp/lien-v487/verify-runtime.mjs \
 && node --check /tmp/lien-v487/test-runtime.mjs \
 && node /tmp/lien-v487/patch-runtime.mjs \
 && node /tmp/lien-v487/verify-runtime.mjs \
 && node /tmp/lien-v487/test-runtime.mjs \
 && rm -rf /tmp/lien-v487

USER nextjs
