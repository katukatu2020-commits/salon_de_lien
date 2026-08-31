ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:1f2e421365ed449f2ceb8fe04dd34481852063001d84f36974e931c918a0bb12
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/store-app-stability-v502/
RUN node --check /tmp/store-app-stability-v502/patch-runtime.mjs \
 && node --check /tmp/store-app-stability-v502/verify-runtime.mjs \
 && node /tmp/store-app-stability-v502/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/store-app-stability-v502/verify-runtime.mjs \
 && rm -rf /tmp/store-app-stability-v502

USER nextjs
