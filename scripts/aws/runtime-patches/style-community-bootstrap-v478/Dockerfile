ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:e876a1d3122b79aa519ad5ebaa9dbb5256adf2752b3d5f459b051659cebb416e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v478/
RUN node --check /tmp/lien-v478/patch-runtime.mjs \
 && node --check /tmp/lien-v478/verify-runtime.mjs \
 && node --check /tmp/lien-v478/test-runtime.mjs \
 && node /tmp/lien-v478/patch-runtime.mjs \
 && node /tmp/lien-v478/verify-runtime.mjs \
 && node /tmp/lien-v478/test-runtime.mjs \
 && rm -rf /tmp/lien-v478

USER nextjs
