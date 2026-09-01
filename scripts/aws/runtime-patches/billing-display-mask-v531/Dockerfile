ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ea572f4ed0bd7c57512a35eb5e39de0aa54d118ad8d240155c2487f0beea2145
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v531/

RUN node --check /tmp/lien-v531/patch-runtime.mjs \
 && node --check /tmp/lien-v531/verify-runtime.mjs \
 && node /tmp/lien-v531/patch-runtime.mjs \
 && node --check /app/billing.js \
 && node --check /app/server.js \
 && node --check /app/.next/server/app/admin/owner-analytics/page.js \
 && node /tmp/lien-v531/verify-runtime.mjs \
 && rm -rf /tmp/lien-v531

USER nextjs
