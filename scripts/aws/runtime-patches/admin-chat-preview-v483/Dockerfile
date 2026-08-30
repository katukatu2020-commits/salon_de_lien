ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:2205d0c89c964a8114de94e3dc70ba90f697e25bbeb815c70bfd5fd51d51f129
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v483/
RUN node --check /tmp/lien-v483/patch-runtime.mjs \
 && node --check /tmp/lien-v483/verify-runtime.mjs \
 && node --check /tmp/lien-v483/test-runtime.mjs \
 && node /tmp/lien-v483/patch-runtime.mjs \
 && node /tmp/lien-v483/verify-runtime.mjs \
 && node /tmp/lien-v483/test-runtime.mjs \
 && rm -rf /tmp/lien-v483

USER nextjs
