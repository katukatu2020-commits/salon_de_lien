ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:02353719072f8d7d0ab8ed749dded448bb0773b4863a59e80b44091bdf044b8b
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v525/

RUN node --check /tmp/lien-v525/patch-runtime.mjs \
 && node --check /tmp/lien-v525/verify-runtime.mjs \
 && node /tmp/lien-v525/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/.next/server/app/admin/customers/messages/page.js \
 && node /tmp/lien-v525/verify-runtime.mjs \
 && rm -rf /tmp/lien-v525

USER nextjs
