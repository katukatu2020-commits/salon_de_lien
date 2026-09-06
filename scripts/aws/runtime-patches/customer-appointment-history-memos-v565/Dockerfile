ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:0423b149b2b1d29ddc41a5e5771c6df86410fdd21ac8117c0991a067300d74d4
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-appointment-history-service-v565.js customer-appointment-history-client-v565.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v565/

RUN node --check /tmp/lien-v565/customer-appointment-history-service-v565.js \
 && node --check /tmp/lien-v565/customer-appointment-history-client-v565.js \
 && node --check /tmp/lien-v565/patch-runtime.mjs \
 && node --check /tmp/lien-v565/verify-runtime.mjs \
 && node --check /tmp/lien-v565/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v565/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/customer-appointment-history-v565.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v565/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v565/verify-runtime.mjs \
 && rm -rf /tmp/lien-v565

USER nextjs
