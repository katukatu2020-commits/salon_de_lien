ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:2a1a279e518565e830cbdf6fdc2923e3411ff201425b97fdc3c3fddc12569442
FROM ${BASE_IMAGE}

USER root
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v422/
RUN node /tmp/lien-v422/patch-runtime.mjs \
    && node /tmp/lien-v422/verify-runtime.mjs \
    && rm -rf /tmp/lien-v422
USER nextjs
