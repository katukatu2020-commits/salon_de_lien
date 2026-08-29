ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:e5cc2dd9688d251be3f04f323093608bb1c74c790a012e325a8959f6c19a36f0
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v459/
RUN node --check /tmp/lien-v459/patch-runtime.mjs \
 && node --check /tmp/lien-v459/verify-runtime.mjs \
 && node /tmp/lien-v459/patch-runtime.mjs \
 && node /tmp/lien-v459/verify-runtime.mjs \
 && rm -rf /tmp/lien-v459

USER nextjs
