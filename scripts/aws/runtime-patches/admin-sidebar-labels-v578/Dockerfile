ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:673e9020b0e64dfc6c6ebf278d4c881818de22f9028bdbbf0e2809c4841d50c8
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v578/

RUN node --check /tmp/lien-v578/patch-runtime.mjs \
 && node --check /tmp/lien-v578/verify-runtime.mjs \
 && node /tmp/lien-v578/patch-runtime.mjs \
 && node --check /app/.next/static/chunks/app/layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.js \
 && node --check /app/.next/server/chunks/1425.js \
 && node --check /app/customer-campaigns-v427.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/billing.js \
 && node --check /app/server.js \
 && node /tmp/lien-v578/verify-runtime.mjs \
 && rm -rf /tmp/lien-v578

USER nextjs
