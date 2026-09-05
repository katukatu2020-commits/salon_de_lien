ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:dadb2d2bf090e2c54c8f1bbdf88db12121e2fdf65b729a915ca1a7e85187abc7
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY wholesale-ordering-v543.js wholesale-ordering-client-v543.js wholesale-ordering-v543.css wholesale-entry-v543.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v543/

RUN node --check /tmp/lien-v543/wholesale-ordering-v543.js \
 && node --check /tmp/lien-v543/wholesale-ordering-client-v543.js \
 && node --check /tmp/lien-v543/wholesale-entry-v543.js \
 && node --check /tmp/lien-v543/patch-runtime.mjs \
 && node --check /tmp/lien-v543/verify-runtime.mjs \
 && node /tmp/lien-v543/patch-runtime.mjs \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/server.js \
 && node /tmp/lien-v543/verify-runtime.mjs \
 && rm -rf /tmp/lien-v543

USER nextjs
