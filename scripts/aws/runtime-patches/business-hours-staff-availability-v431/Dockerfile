ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:4c89716f641c3f82534f273450600cb6b3970cbc0e4b3ef9db869d6dfca7babd
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v431/

RUN node --check /tmp/lien-v431/patch-runtime.mjs \
 && node /tmp/lien-v431/patch-runtime.mjs \
 && node --check /app/store-profile.js \
 && node /tmp/lien-v431/verify-runtime.mjs \
 && rm -rf /tmp/lien-v431

USER nextjs
