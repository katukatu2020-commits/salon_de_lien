ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:519c942357b446dfc392956077aea6bd7f4149c40c03ae7203ad09505124cb8c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v526/

RUN node --check /tmp/lien-v526/patch-runtime.mjs \
 && node --check /tmp/lien-v526/verify-runtime.mjs \
 && node /tmp/lien-v526/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/tenant-setup-client.js \
 && node --check /app/.next/static/chunks/app/admin/appointments/page-shift-grid-sync-v526.js \
 && node /tmp/lien-v526/verify-runtime.mjs \
 && rm -rf /tmp/lien-v526

USER nextjs
