ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d8dccd543898a2e4891e3b20fd2eaaaef0909fe10c950dfe6c08c3901506803e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v571/

RUN node --check /tmp/lien-v571/patch-runtime.mjs \
 && node --check /tmp/lien-v571/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v571/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v571/verify-runtime.mjs \
 && rm -rf /tmp/lien-v571

USER nextjs
