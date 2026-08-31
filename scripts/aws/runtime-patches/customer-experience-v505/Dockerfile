ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b5e48a796cd850fb77a79dfa245984e552560e97628d3dc8d4f3a895d3e46ea1
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs customer-experience-v505.js customer-experience-v505.css /tmp/customer-experience-v505/
RUN node --check /tmp/customer-experience-v505/patch-runtime.mjs \
 && node --check /tmp/customer-experience-v505/verify-runtime.mjs \
 && node --check /tmp/customer-experience-v505/customer-experience-v505.js \
 && node /tmp/customer-experience-v505/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-experience-v505.js \
 && node /tmp/customer-experience-v505/verify-runtime.mjs \
 && rm -rf /tmp/customer-experience-v505

USER nextjs
