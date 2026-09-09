ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:7b39221772e19197bb5b767426ae42275939580ae2d73a4ca9c4b789c309807d
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY patch-runtime.mjs /tmp/lien-v587/patch-runtime.mjs
RUN node --check /tmp/lien-v587/patch-runtime.mjs \
 && node /tmp/lien-v587/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/inbound-email.js \
 && node --check /app/billing.js \
 && rm /tmp/lien-v587/patch-runtime.mjs
USER nextjs
