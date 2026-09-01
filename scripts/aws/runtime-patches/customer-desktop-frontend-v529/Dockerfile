ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:fd2ada031c8c70e2da9b5a90b19e7cd59ffe6c27e24c0f9258015c8fd7460482
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-desktop-shell-v529.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v529/

RUN node --check /tmp/lien-v529/customer-desktop-shell-v529.js \
 && node --check /tmp/lien-v529/patch-runtime.mjs \
 && node --check /tmp/lien-v529/verify-runtime.mjs \
 && node /tmp/lien-v529/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-experience-v503.js \
 && node --check /app/customer-experience-v508.js \
 && node /tmp/lien-v529/verify-runtime.mjs \
 && rm -rf /tmp/lien-v529

USER nextjs
