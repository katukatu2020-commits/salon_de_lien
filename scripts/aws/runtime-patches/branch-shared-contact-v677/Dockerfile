ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:a5c6d10d40f4b9cb1a0a4430c53d9b0e6596a7bcb5581f49b10417d23b238f58
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v677/
RUN node /tmp/lien-v677/patch-runtime.mjs \
 && node --check /app/business-account-approvals-v643.js \
 && node --check /app/salon-branch-inquiry-v675.js \
 && node --check /app/branch-shared-contact-v677.js \
 && node --check /app/server.js \
 && node /tmp/lien-v677/verify-runtime.mjs
USER nextjs
