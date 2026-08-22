ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-chat-datetime-sides-v359
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/store-hidden-customer-consistency-v360/patch-runtime.mjs /tmp/patch-store-hidden-customer-consistency-v360.mjs
COPY scripts/aws/runtime-patches/store-hidden-customer-consistency-v360/verify-runtime.mjs /tmp/verify-store-hidden-customer-consistency-v360.mjs

RUN node /tmp/patch-store-hidden-customer-consistency-v360.mjs \
 && node /tmp/verify-store-hidden-customer-consistency-v360.mjs \
 && find /app/.next/server/app/admin /app/.next/server/app/api/admin -name '*.js' -print0 | xargs -0 -n1 node --check \
 && node --check /app/.next/server/chunks/3244.js \
 && node --check /app/.next/server/chunks/4441.js \
 && node --check /app/.next/server/chunks/6006.js \
 && node --check /app/.next/server/chunks/9845.js

USER nextjs

