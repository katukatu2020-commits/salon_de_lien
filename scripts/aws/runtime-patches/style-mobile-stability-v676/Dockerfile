ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:1c503e2f14a080a02e094a365b81347e40d02603824e957d2174782a1bc2ec3f
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v676/
RUN node /tmp/lien-v676/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/content-edit-delete-client-v615.js \
 && node /tmp/lien-v676/verify-runtime.mjs
USER nextjs
