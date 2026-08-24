ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d905405aa2440fde13871b5838898a581b9c10bcadc6911e98b7f4f65bd2c72c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-campaigns-v427.js /app/customer-campaigns-v427.js
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v429/
RUN node --check /app/customer-campaigns-v427.js \
 && node --check /tmp/lien-v429/patch-runtime.mjs \
 && node /tmp/lien-v429/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-campaigns-v427.js \
 && node /tmp/lien-v429/verify-runtime.mjs \
 && rm -rf /tmp/lien-v429

USER nextjs
