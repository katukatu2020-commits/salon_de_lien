ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:87983c3fbe585851aaae7dc50eb95b44788f3ad8828c47ece83daf2db2959224
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v484/
RUN node --check /tmp/lien-v484/patch-runtime.mjs \
 && node --check /tmp/lien-v484/verify-runtime.mjs \
 && node --check /tmp/lien-v484/test-runtime.mjs \
 && node /tmp/lien-v484/patch-runtime.mjs \
 && node /tmp/lien-v484/verify-runtime.mjs \
 && node /tmp/lien-v484/test-runtime.mjs \
 && rm -rf /tmp/lien-v484

USER nextjs
