ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:253b224f69733d981d637fc3c800c8fd0fda465422f40f0e024043f1f0560dc5
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v455/
RUN node --check /tmp/lien-v455/patch-runtime.mjs \
 && node --check /tmp/lien-v455/verify-runtime.mjs \
 && node /tmp/lien-v455/patch-runtime.mjs \
 && node /tmp/lien-v455/verify-runtime.mjs \
 && rm -rf /tmp/lien-v455

USER nextjs
