ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:9f2f868b7acf0e9873a66ff5ecbb7cce9466a974dba80bd8b3d3695802b6671c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v433/

RUN node --check /tmp/lien-v433/patch-runtime.mjs \
 && node /tmp/lien-v433/patch-runtime.mjs \
 && node /tmp/lien-v433/verify-runtime.mjs \
 && rm -rf /tmp/lien-v433

USER nextjs
