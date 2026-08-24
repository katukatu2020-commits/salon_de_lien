ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:70ffb768f1ce52b0aa0669ad5668039655750df642c9c018909bf89840e3dde1
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-campaigns-v427.js /app/customer-campaigns-v427.js
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v427/
RUN node --check /app/customer-campaigns-v427.js \
 && node --check /tmp/lien-v427/patch-runtime.mjs \
 && node /tmp/lien-v427/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/ui-workflows-v294.js \
 && node /tmp/lien-v427/verify-runtime.mjs \
 && rm -rf /tmp/lien-v427

USER nextjs
