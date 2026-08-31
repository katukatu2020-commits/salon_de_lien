ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ff249883a7deb290ec389896359fc11b8d07d0d3ec68494b4299b88ae15f9a8f
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs customer-experience-v504.js customer-experience-v504.css /tmp/customer-experience-v504/
RUN node --check /tmp/customer-experience-v504/patch-runtime.mjs \
 && node --check /tmp/customer-experience-v504/verify-runtime.mjs \
 && node --check /tmp/customer-experience-v504/customer-experience-v504.js \
 && node /tmp/customer-experience-v504/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-experience-v504.js \
 && node /tmp/customer-experience-v504/verify-runtime.mjs \
 && rm -rf /tmp/customer-experience-v504

USER nextjs
