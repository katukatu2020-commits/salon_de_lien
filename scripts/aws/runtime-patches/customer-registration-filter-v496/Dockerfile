ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:de9d26acd86df58b777bd2adb48ead4f39ff978306892ba99e2c9654ad8019eb
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v496/
RUN node --check /tmp/lien-v496/patch-runtime.mjs \
 && node --check /tmp/lien-v496/verify-runtime.mjs \
 && node --check /tmp/lien-v496/test-runtime.mjs \
 && node /tmp/lien-v496/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/lien-v496/verify-runtime.mjs \
 && node /tmp/lien-v496/test-runtime.mjs \
 && rm -rf /tmp/lien-v496

USER nextjs
