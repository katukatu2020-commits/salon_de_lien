ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:7468c7647b834c1a43997769b406cba3d0cdd1b22fd322c86fddb0b0000806d3
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v583/

RUN node --check /tmp/lien-v583/patch-runtime.mjs \
 && node --check /tmp/lien-v583/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v583/patch-runtime.mjs \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v583/verify-runtime.mjs \
 && rm -rf /tmp/lien-v583

USER nextjs
