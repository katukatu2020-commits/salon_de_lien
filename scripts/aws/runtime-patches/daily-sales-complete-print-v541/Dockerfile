ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:0119d632dfad5d17bbbe2f99c4f2ef9045d21d49b43d8f3a2230a108ae83348b
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY daily-sales-complete-print-v541.css daily-sales-complete-print-v541.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v541/

RUN node --check /tmp/lien-v541/daily-sales-complete-print-v541.js \
 && node --check /tmp/lien-v541/patch-runtime.mjs \
 && node --check /tmp/lien-v541/verify-runtime.mjs \
 && node /tmp/lien-v541/patch-runtime.mjs \
 && node --check /app/public/daily-sales-complete-print-v541.js \
 && node --check /app/server.js \
 && node /tmp/lien-v541/verify-runtime.mjs \
 && rm -rf /tmp/lien-v541

USER nextjs
