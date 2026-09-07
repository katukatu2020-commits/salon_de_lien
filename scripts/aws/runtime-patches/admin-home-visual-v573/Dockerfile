ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:343a518a6314812e3b9d425fec67ff8f3f2b55855db35f520dfcd75c67e1565f
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY admin-home-visual-v573.js admin-home-visual-v573.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v573/

RUN node --check /tmp/lien-v573/admin-home-visual-v573.js \
 && node --check /tmp/lien-v573/patch-runtime.mjs \
 && node --check /tmp/lien-v573/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v573/patch-runtime.mjs \
 && node --check /app/public/admin-home-visual-v573.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v573/verify-runtime.mjs \
 && rm -rf /tmp/lien-v573

USER nextjs
