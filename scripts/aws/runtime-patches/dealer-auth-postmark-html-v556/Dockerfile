ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:6e321c8a7566ab4787c6d36a74a258e59e4d07ab698aca79dcabe0deb0baf904
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs dealer-auth-mail-content-v556.js /tmp/lien-v556/

RUN node --check /tmp/lien-v556/patch-runtime.mjs \
 && node --check /tmp/lien-v556/verify-runtime.mjs \
 && node --check /tmp/lien-v556/test-runtime.mjs \
 && node --check /tmp/lien-v556/dealer-auth-mail-content-v556.js \
 && node /tmp/lien-v556/test-runtime.mjs \
 && node /tmp/lien-v556/patch-runtime.mjs \
 && node --check /app/dealer-auth-mail-content-v556.js \
 && node --check /app/dealer-auth-postmark-v555.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/server.js \
 && node /tmp/lien-v556/verify-runtime.mjs \
 && rm -rf /tmp/lien-v556

USER nextjs
