ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:897e65e63def09dd6447756ab38607dfec1cc217fde31c4def24ab6411bb1b5d
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v460/
RUN node --check /tmp/lien-v460/patch-runtime.mjs \
 && node --check /tmp/lien-v460/verify-runtime.mjs \
 && node /tmp/lien-v460/patch-runtime.mjs \
 && node /tmp/lien-v460/verify-runtime.mjs \
 && rm -rf /tmp/lien-v460

USER nextjs
