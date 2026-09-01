ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:63c4c59d07a2a4da26390133193468e527752f7dc85eaf13d93eb072e15621ef
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs shell-consistency-v518.js shell-consistency-v518.css /tmp/lien-v518/

RUN node --check /tmp/lien-v518/patch-runtime.mjs \
 && node --check /tmp/lien-v518/verify-runtime.mjs \
 && node --check /tmp/lien-v518/shell-consistency-v518.js \
 && node /tmp/lien-v518/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/shell-consistency-v518.js \
 && node --check /app/.next/static/chunks/app/layout-runtime-v518-release1.js \
 && node --check "/app/.next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.orimia-v518.js" \
 && node /tmp/lien-v518/verify-runtime.mjs \
 && rm -rf /tmp/lien-v518

USER nextjs
