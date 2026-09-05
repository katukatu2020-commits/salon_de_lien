ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:0de81f5f689a76262cd35360804a90c01807e18c3e23f1d36b570bdc101fa4c5
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-registration-single-loader-v544.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v544/

RUN node --check /tmp/lien-v544/patch-runtime.mjs \
 && node --check /tmp/lien-v544/verify-runtime.mjs \
 && node /tmp/lien-v544/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/lien-v544/verify-runtime.mjs \
 && rm -rf /tmp/lien-v544

USER nextjs
