ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:5c16a6b5a196260608435ccb743d2c41d8a254c1618f5ff3075a4496a07213ec
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY orimia-brand-v500.js orimia.webmanifest /app/public/
COPY assets/ /app/public/brand/
COPY patch-runtime.mjs verify-runtime.mjs /tmp/orimia-v500/
RUN node --check /tmp/orimia-v500/patch-runtime.mjs \
 && node --check /tmp/orimia-v500/verify-runtime.mjs \
 && node --check /app/public/orimia-brand-v500.js \
 && node /tmp/orimia-v500/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/orimia-v500/verify-runtime.mjs \
 && rm -rf /tmp/orimia-v500

USER nextjs
