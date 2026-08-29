ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:f84e4d21bfe8e5654c4b925b13db95439885fc34560179792bcb7c8e0bdb31e4
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v454/
RUN node --check /tmp/lien-v454/patch-runtime.mjs \
 && node --check /tmp/lien-v454/verify-runtime.mjs \
 && node /tmp/lien-v454/patch-runtime.mjs \
 && node /tmp/lien-v454/verify-runtime.mjs \
 && rm -rf /tmp/lien-v454

USER nextjs
