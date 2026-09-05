ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:cddecdf8f090b2f30ab67449f6e952ca3c55408c93a1278eef356ab0273137e0
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v546/

RUN node --check /tmp/lien-v546/patch-runtime.mjs \
 && node --check /tmp/lien-v546/verify-runtime.mjs \
 && node /tmp/lien-v546/patch-runtime.mjs \
 && node --check /app/public/shell-consistency-v518.js \
 && node --check /app/customer-experience-v503.js \
 && node --check /app/.next/server/chunks/2616.js \
 && node --check /app/.next/static/chunks/6012-community-customer-privacy-v546.js \
 && node --check '/app/.next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.navigation-privacy-v546.js' \
 && node --check /app/server.js \
 && node /tmp/lien-v546/verify-runtime.mjs \
 && rm -rf /tmp/lien-v546

USER nextjs
