ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:acf611073379c35d7383a71f3dc541509ef87b21da53092aa199d985102ae1c9
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-profile-v426.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v426/
RUN node /tmp/lien-v426/patch-runtime.mjs \
 && node /tmp/lien-v426/verify-runtime.mjs \
 && rm -rf /tmp/lien-v426

USER nextjs
