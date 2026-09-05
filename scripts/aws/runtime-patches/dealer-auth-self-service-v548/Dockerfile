ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:729f69c404f150e2ce9006869dde140384217ec46771466bbfe9f4f5258447ce
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY wholesale-ordering-v543.js wholesale-ordering-v543.css wholesale-ordering-client-v543.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v548/

RUN node --check /tmp/lien-v548/wholesale-ordering-v543.js \
 && node --check /tmp/lien-v548/wholesale-ordering-client-v543.js \
 && node --check /tmp/lien-v548/patch-runtime.mjs \
 && node --check /tmp/lien-v548/verify-runtime.mjs \
 && node --check /tmp/lien-v548/test-runtime.mjs \
 && node /tmp/lien-v548/test-runtime.mjs \
 && node /tmp/lien-v548/patch-runtime.mjs \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/server.js \
 && node /tmp/lien-v548/verify-runtime.mjs \
 && rm -rf /tmp/lien-v548

USER nextjs
