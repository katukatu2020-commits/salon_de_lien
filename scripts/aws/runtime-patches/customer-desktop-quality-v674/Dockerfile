ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d9608f01e5465e6730cfa6a36ecc1002233da1ef38a18683060e3fd0d46a58b7
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v674/
RUN node /tmp/lien-v674/patch-runtime.mjs \
 && node --check /app/customer-experience-v503.js \
 && node --check /app/customer-experience-v508.js \
 && node --check /app/server.js \
 && node /tmp/lien-v674/verify-runtime.mjs
USER nextjs
