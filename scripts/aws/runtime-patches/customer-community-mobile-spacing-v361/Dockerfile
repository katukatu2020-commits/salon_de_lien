ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:store-hidden-customer-consistency-v360
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-community-mobile-spacing-v361/patch-runtime.mjs /tmp/patch-customer-community-mobile-spacing-v361.mjs
COPY scripts/aws/runtime-patches/customer-community-mobile-spacing-v361/verify-runtime.mjs /tmp/verify-customer-community-mobile-spacing-v361.mjs

RUN node /tmp/patch-customer-community-mobile-spacing-v361.mjs \
 && node /tmp/verify-customer-community-mobile-spacing-v361.mjs \
 && node --check /app/.next/server/chunks/2616.js \
 && node --check /app/.next/static/chunks/6012-e16edeb2a61e1c80.js

USER nextjs

