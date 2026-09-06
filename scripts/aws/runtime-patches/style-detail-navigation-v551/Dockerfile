ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:9bf58b38ec87573919ac50e24d246f62b49e6b9f8002522084fbb91a064c54d7
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v551/

RUN node --check /tmp/lien-v551/patch-runtime.mjs \
 && node --check /tmp/lien-v551/verify-runtime.mjs \
 && node --check /tmp/lien-v551/test-runtime.mjs \
 && node /tmp/lien-v551/test-runtime.mjs \
 && node /tmp/lien-v551/patch-runtime.mjs \
 && node --check /app/public/shell-consistency-v518.js \
 && node --check /app/server.js \
 && node /tmp/lien-v551/verify-runtime.mjs \
 && rm -rf /tmp/lien-v551

USER nextjs
