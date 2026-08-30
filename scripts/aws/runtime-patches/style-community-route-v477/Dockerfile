ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:4470a477c5ed5cb969d26a4d182e401c36b13117bd71fa4b5589bb2a0f57f5ef
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-edit-delete-client-v477.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v477/
RUN node --check /tmp/lien-v477/content-edit-delete-client-v477.js \
 && node --check /tmp/lien-v477/patch-runtime.mjs \
 && node --check /tmp/lien-v477/verify-runtime.mjs \
 && node --check /tmp/lien-v477/test-runtime.mjs \
 && node /tmp/lien-v477/patch-runtime.mjs \
 && node /tmp/lien-v477/verify-runtime.mjs \
 && node /tmp/lien-v477/test-runtime.mjs \
 && rm -rf /tmp/lien-v477

USER nextjs
