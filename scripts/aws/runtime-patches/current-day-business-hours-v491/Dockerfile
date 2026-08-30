ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:61626129047911d84cf156c7ec7e61a0a7c96c2ae24fdfb29c395d92c4ac26fd
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v491/
RUN node --check /tmp/lien-v491/patch-runtime.mjs \
 && node --check /tmp/lien-v491/verify-runtime.mjs \
 && node --check /tmp/lien-v491/test-runtime.mjs \
 && node /tmp/lien-v491/patch-runtime.mjs \
 && node /tmp/lien-v491/verify-runtime.mjs \
 && node /tmp/lien-v491/test-runtime.mjs \
 && rm -rf /tmp/lien-v491

USER nextjs
