ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:864632c53e7bba276114eadf935cb448093980e4ec878acd8d2f3fc42dd13194
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs smoke-production.mjs test-runtime.mjs update-break-function-v461.txt shift-line-break-interaction-client-v461.js /tmp/lien-v461/
RUN node --check /tmp/lien-v461/patch-runtime.mjs \
 && node --check /tmp/lien-v461/verify-runtime.mjs \
 && node --check /tmp/lien-v461/smoke-production.mjs \
 && node --check /tmp/lien-v461/test-runtime.mjs \
 && node --check /tmp/lien-v461/shift-line-break-interaction-client-v461.js \
 && node /tmp/lien-v461/patch-runtime.mjs \
 && node /tmp/lien-v461/verify-runtime.mjs \
 && node /tmp/lien-v461/test-runtime.mjs \
 && rm -rf /tmp/lien-v461

USER nextjs
