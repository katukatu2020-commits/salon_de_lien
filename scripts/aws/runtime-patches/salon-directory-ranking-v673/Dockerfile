ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:9c0525d1e30f79b655e7f03a95cd20a6cc6087ef2a5d4315ab60d48e574c2163
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v673/
RUN node --check /tmp/lien-v673/salon-directory-ranking-v673.js \
 && node --check /tmp/lien-v673/salon-directory-ranking-v673-client.js \
 && node /tmp/lien-v673/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-links-v293.js \
 && node /tmp/lien-v673/verify-runtime.mjs
USER nextjs
