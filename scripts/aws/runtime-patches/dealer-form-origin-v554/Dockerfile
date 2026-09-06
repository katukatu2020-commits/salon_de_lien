ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d33704196886c35299a94af952b1b349f4634246b26e7e4ee9fbcd891978beab
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs dealer-origin-policy-v554.js /tmp/lien-v554/

RUN node --check /tmp/lien-v554/patch-runtime.mjs \
 && node --check /tmp/lien-v554/verify-runtime.mjs \
 && node --check /tmp/lien-v554/test-runtime.mjs \
 && node --check /tmp/lien-v554/dealer-origin-policy-v554.js \
 && node /tmp/lien-v554/test-runtime.mjs \
 && node /tmp/lien-v554/patch-runtime.mjs \
 && node --check /app/dealer-origin-policy-v554.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/server.js \
 && node /tmp/lien-v554/verify-runtime.mjs \
 && rm -rf /tmp/lien-v554

USER nextjs
