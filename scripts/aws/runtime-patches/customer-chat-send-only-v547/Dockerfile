ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c0610ebfd0f508ecb4c7e0986a13398a66b2da04ba8a6921a9fabdcdb9f46f7f
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v547/

RUN node --check /tmp/lien-v547/patch-runtime.mjs \
 && node --check /tmp/lien-v547/verify-runtime.mjs \
 && node --check /tmp/lien-v547/test-runtime.mjs \
 && node /tmp/lien-v547/test-runtime.mjs \
 && node /tmp/lien-v547/patch-runtime.mjs \
 && node --check /app/ui-workflows-v294.js \
 && node --check '/app/.next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.chat-send-only-v547.js' \
 && node --check /app/server.js \
 && node /tmp/lien-v547/verify-runtime.mjs \
 && rm -rf /tmp/lien-v547

USER nextjs
