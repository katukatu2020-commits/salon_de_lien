ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:5c3819200ddf97ee69bec3c23dbe0914895354e8c0f1bf5fa7e3e09ea762e16a
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY ui-transition-v516.js ui-transition-v516.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v516/

RUN node --check /tmp/lien-v516/ui-transition-v516.js \
 && node --check /tmp/lien-v516/patch-runtime.mjs \
 && node --check /tmp/lien-v516/verify-runtime.mjs \
 && node /tmp/lien-v516/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/customer-experience-v508.js \
 && node --check /app/customer-experience-v503.js \
 && node --check /app/public/product-insights-v515.js \
 && node --check /app/.next/static/chunks/app/layout-runtime-v516-release5.js \
 && node --check /app/.next/static/chunks/app/layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.js \
 && node /tmp/lien-v516/verify-runtime.mjs \
 && rm -rf /tmp/lien-v516

USER nextjs
