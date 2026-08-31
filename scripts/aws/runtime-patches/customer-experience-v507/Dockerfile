ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:86507f5d5e863bb1d048e0cbe4e00a4523c7cb5d3077cb307b7c5fd8de88387e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs customer-experience-v507.js customer-experience-v507.css /tmp/customer-experience-v507/
RUN node --check /tmp/customer-experience-v507/patch-runtime.mjs \
 && node --check /tmp/customer-experience-v507/verify-runtime.mjs \
 && node --check /tmp/customer-experience-v507/customer-experience-v507.js \
 && node /tmp/customer-experience-v507/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-experience-v507.js \
 && node /tmp/customer-experience-v507/verify-runtime.mjs \
 && rm -rf /tmp/customer-experience-v507

USER nextjs
