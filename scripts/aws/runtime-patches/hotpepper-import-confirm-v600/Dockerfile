ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:e9f811d86713548643622b03a29b9cfae6d1aa2e8718ebf7b4fe9b50b673bdfc
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v600/
RUN node /tmp/lien-v600/verify-runtime.mjs snapshot \
 && node /tmp/lien-v600/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/hotpepper-import-v600.js \
 && node --check /app/community-publishing-client-v566.js \
 && node /tmp/lien-v600/test-origin.cjs \
 && node /tmp/lien-v600/verify-runtime.mjs
USER nextjs
