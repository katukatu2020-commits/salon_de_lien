ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:2f708460c398b6b8069857aa28487d7e279c72c11d2aa6a84ffb75f3d818696b
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs ui-transition-v536.js ui-transition-v536.css /tmp/lien-v536/

RUN node --check /tmp/lien-v536/patch-runtime.mjs \
 && node --check /tmp/lien-v536/verify-runtime.mjs \
 && node --check /tmp/lien-v536/ui-transition-v536.js \
 && node /tmp/lien-v536/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/ui-transition-v536.js \
 && node /tmp/lien-v536/verify-runtime.mjs \
 && rm -rf /tmp/lien-v536

USER nextjs
