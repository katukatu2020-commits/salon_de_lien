ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:20d40c0a34c6e611b0534bb82a528079ef6447f1192d1af172120b88cc6f072e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v511/
RUN node --check /tmp/lien-v511/patch-runtime.mjs \
 && node --check /tmp/lien-v511/verify-runtime.mjs \
 && node /tmp/lien-v511/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public-site.js \
 && node /tmp/lien-v511/verify-runtime.mjs \
 && rm -rf /tmp/lien-v511

USER nextjs
