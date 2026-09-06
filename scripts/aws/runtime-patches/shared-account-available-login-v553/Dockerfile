ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:acf64dfb1891a57dfb17da38537edbf197f419c4f77b07c1bb0bca0c781ec86e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs shared-account-service-v553.js /tmp/lien-v553/

RUN node --check /tmp/lien-v553/patch-runtime.mjs \
 && node --check /tmp/lien-v553/verify-runtime.mjs \
 && node --check /tmp/lien-v553/test-runtime.mjs \
 && node --check /tmp/lien-v553/shared-account-service-v553.js \
 && node /tmp/lien-v553/test-runtime.mjs \
 && node /tmp/lien-v553/patch-runtime.mjs \
 && node --check /app/shared-account-service-v553.js \
 && node --check /app/sales-ledger-accounts-v318.js \
 && node --check /app/.next/server/app/api/auth/account/route.js \
 && node --check /app/.next/server/app/api/auth/login/route.js \
 && node --check /app/.next/server/app/admin/account/page.js \
 && node --check /app/server.js \
 && node /tmp/lien-v553/verify-runtime.mjs \
 && rm -rf /tmp/lien-v553

USER nextjs
