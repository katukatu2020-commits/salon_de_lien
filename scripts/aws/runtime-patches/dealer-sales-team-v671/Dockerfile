ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:1b17258461c0aaf8fd483a0275979b4cc3ee16344febced038d2a6450a403305
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v671/
RUN node --check /tmp/lien-v671/dealer-sales-team-v671.js \
 && node --check /tmp/lien-v671/dealer-sales-team-v671-client.js \
 && node /tmp/lien-v671/patch-runtime.mjs \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/business-account-approvals-v643.js \
 && node --check /app/server.js \
 && node /tmp/lien-v671/verify-runtime.mjs
USER nextjs
