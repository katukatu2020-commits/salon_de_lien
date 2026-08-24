ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:81e0c65e80d4076f489f8dd150ee91588737cf49b543366f8ab06ce8f8a21d6d
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v432/

RUN node --check /tmp/lien-v432/patch-runtime.mjs \
 && node /tmp/lien-v432/patch-runtime.mjs \
 && node --check /app/customer-campaigns-v427.js \
 && node /tmp/lien-v432/verify-runtime.mjs \
 && rm -rf /tmp/lien-v432

USER nextjs
