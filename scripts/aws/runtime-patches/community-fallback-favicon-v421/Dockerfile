ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:2effc97d56cd333a7a8cc3a570466abacb97a9dff8c21cd0c59d09278d180bfb
FROM ${BASE_IMAGE}

USER root
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v421/
RUN node /tmp/lien-v421/patch-runtime.mjs \
    && node /tmp/lien-v421/verify-runtime.mjs \
    && rm -rf /tmp/lien-v421
USER nextjs
