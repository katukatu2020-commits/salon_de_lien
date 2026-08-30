ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:2cdae5dbdd94ce2d3d9c109648338659909c1bdc81de35b07cf23a185402d264
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v473/
RUN node --check /tmp/lien-v473/patch-runtime.mjs \
 && node --check /tmp/lien-v473/verify-runtime.mjs \
 && node /tmp/lien-v473/patch-runtime.mjs \
 && node /tmp/lien-v473/verify-runtime.mjs \
 && rm -rf /tmp/lien-v473

USER nextjs
