ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:3db86a1a18d81cd619aec43c64e221dc190fe1daefa3e4520e4fd05fd3c1aba1
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v456/
RUN node --check /tmp/lien-v456/patch-runtime.mjs \
 && node --check /tmp/lien-v456/verify-runtime.mjs \
 && node /tmp/lien-v456/patch-runtime.mjs \
 && node /tmp/lien-v456/verify-runtime.mjs \
 && rm -rf /tmp/lien-v456

USER nextjs

