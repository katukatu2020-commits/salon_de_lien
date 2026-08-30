ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d5a23c0ee816d74df7f744bdb3c0bfb28b992edbc1a17005682885a15ebaf363
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY external-integrations-client-v492.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v492/
RUN node --check /tmp/lien-v492/external-integrations-client-v492.js \
 && node --check /tmp/lien-v492/patch-runtime.mjs \
 && node --check /tmp/lien-v492/verify-runtime.mjs \
 && node --check /tmp/lien-v492/test-runtime.mjs \
 && node /tmp/lien-v492/patch-runtime.mjs \
 && node /tmp/lien-v492/verify-runtime.mjs \
 && node /tmp/lien-v492/test-runtime.mjs \
 && rm -rf /tmp/lien-v492

USER nextjs
