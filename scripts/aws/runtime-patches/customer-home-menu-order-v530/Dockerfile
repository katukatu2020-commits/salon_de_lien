ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:66722977ab5478f25eb2eb3da93c6239edde21f6a3049b6008e8ab2d784f5843
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v530/

RUN node --check /tmp/lien-v530/patch-runtime.mjs \
 && node --check /tmp/lien-v530/verify-runtime.mjs \
 && node /tmp/lien-v530/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/lien-v530/verify-runtime.mjs \
 && rm -rf /tmp/lien-v530

USER nextjs
