ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:8afb2d3679a0482e3252252e52cbd9295b0b943c43f8461b880525dc0a292bca
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-booking-check-v574.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v574/

RUN node --check /tmp/lien-v574/patch-runtime.mjs \
 && node --check /tmp/lien-v574/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v574/patch-runtime.mjs \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v574/verify-runtime.mjs \
 && rm -rf /tmp/lien-v574

USER nextjs
