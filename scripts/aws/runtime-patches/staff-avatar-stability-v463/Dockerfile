ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:a5ec4ba4ddd71b463122b2880f0c16b2cc7037b21b262f0d79a5aa6311a2ee90
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs smoke-production.mjs test-runtime.mjs /tmp/lien-v463/
RUN node --check /tmp/lien-v463/patch-runtime.mjs \
 && node --check /tmp/lien-v463/verify-runtime.mjs \
 && node --check /tmp/lien-v463/smoke-production.mjs \
 && node --check /tmp/lien-v463/test-runtime.mjs \
 && node /tmp/lien-v463/patch-runtime.mjs \
 && node /tmp/lien-v463/verify-runtime.mjs \
 && node /tmp/lien-v463/test-runtime.mjs \
 && rm -rf /tmp/lien-v463

USER nextjs
