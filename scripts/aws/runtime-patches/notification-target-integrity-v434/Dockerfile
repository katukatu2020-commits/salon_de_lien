ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c43f68e1bba8e0eb9e5f31d06611b37c47845c3412cc1f359736ec80197f2142
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v434/

RUN node --check /tmp/lien-v434/patch-runtime.mjs \
 && node /tmp/lien-v434/patch-runtime.mjs \
 && node /tmp/lien-v434/verify-runtime.mjs \
 && rm -rf /tmp/lien-v434

USER nextjs
