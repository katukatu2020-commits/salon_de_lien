ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:8d8ba8495c0c0a2396595f8acd77bf74664c982be04fe401663be52a4b934232
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs smoke-runtime.mjs /tmp/lien-v452/
RUN node --check /tmp/lien-v452/patch-runtime.mjs \
 && node /tmp/lien-v452/patch-runtime.mjs \
 && node /tmp/lien-v452/verify-runtime.mjs \
 && node /tmp/lien-v452/smoke-runtime.mjs \
 && rm -rf /tmp/lien-v452

USER nextjs
