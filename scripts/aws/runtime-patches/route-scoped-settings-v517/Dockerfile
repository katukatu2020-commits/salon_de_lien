ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:887df292aaa58405ba7e7cb938bb9a4a511e8bf763344c197578afdc08f77651
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v517/

RUN node --check /tmp/lien-v517/patch-runtime.mjs \
 && node --check /tmp/lien-v517/verify-runtime.mjs \
 && node /tmp/lien-v517/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/.next/static/chunks/app/layout-runtime-v517-release1.js \
 && node /tmp/lien-v517/verify-runtime.mjs \
 && rm -rf /tmp/lien-v517

USER nextjs
