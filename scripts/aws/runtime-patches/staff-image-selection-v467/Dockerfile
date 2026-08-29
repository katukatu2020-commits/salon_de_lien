ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:292b6eb5a5b8a9a5807f5f074d291037cfee6be6867a25697bd3abe985b1bea4
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs smoke-production.mjs /tmp/lien-v467/
RUN node --check /tmp/lien-v467/patch-runtime.mjs \
 && node --check /tmp/lien-v467/verify-runtime.mjs \
 && node --check /tmp/lien-v467/test-runtime.mjs \
 && node --check /tmp/lien-v467/smoke-production.mjs \
 && node /tmp/lien-v467/patch-runtime.mjs \
 && node /tmp/lien-v467/verify-runtime.mjs \
 && node /tmp/lien-v467/test-runtime.mjs \
 && rm -rf /tmp/lien-v467

USER nextjs
