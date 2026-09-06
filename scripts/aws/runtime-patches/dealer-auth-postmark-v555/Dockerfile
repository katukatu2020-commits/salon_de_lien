ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:125fd9ab4d453779092e5a04022eefc146108c707f8526c1d7ff7721178b965d
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs dealer-auth-postmark-v555.js /tmp/lien-v555/

RUN node --check /tmp/lien-v555/patch-runtime.mjs \
 && node --check /tmp/lien-v555/verify-runtime.mjs \
 && node --check /tmp/lien-v555/test-runtime.mjs \
 && node --check /tmp/lien-v555/dealer-auth-postmark-v555.js \
 && node /tmp/lien-v555/test-runtime.mjs \
 && node /tmp/lien-v555/patch-runtime.mjs \
 && node --check /app/dealer-auth-postmark-v555.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/server.js \
 && node /tmp/lien-v555/verify-runtime.mjs \
 && rm -rf /tmp/lien-v555

USER nextjs
