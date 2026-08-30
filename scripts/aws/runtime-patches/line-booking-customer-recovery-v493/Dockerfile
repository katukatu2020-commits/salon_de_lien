ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:930b71e0bd01f51fce92f43399e66547957a6e5fbd2cc12fac7a5b12554b37e6
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v493/
RUN node --check /tmp/lien-v493/patch-runtime.mjs \
 && node --check /tmp/lien-v493/verify-runtime.mjs \
 && node --check /tmp/lien-v493/test-runtime.mjs \
 && node /tmp/lien-v493/patch-runtime.mjs \
 && node /tmp/lien-v493/verify-runtime.mjs \
 && node /tmp/lien-v493/test-runtime.mjs \
 && rm -rf /tmp/lien-v493

USER nextjs
