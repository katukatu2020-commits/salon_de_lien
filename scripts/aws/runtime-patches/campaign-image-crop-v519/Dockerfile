ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:4d22d37acc6d7a6408ed1f549ca7efa24626fe9cec7a76e79fc18faa081a6926
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v519/

RUN node --check /tmp/lien-v519/patch-runtime.mjs \
 && node --check /tmp/lien-v519/verify-runtime.mjs \
 && node /tmp/lien-v519/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-link-ui-v293.js \
 && node /tmp/lien-v519/verify-runtime.mjs \
 && rm -rf /tmp/lien-v519

USER nextjs
