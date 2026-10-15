ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:6f5cb94941b59c217199eb8e0a67df7d6d579f0cf73544623d68559ad85773e6
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v715/
RUN node /tmp/lien-v715/patch-runtime.cjs && node /tmp/lien-v715/verify-runtime.mjs
USER nextjs
