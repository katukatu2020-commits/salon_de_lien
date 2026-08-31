ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:436516424dd3b86279e9a29c5ef1b8f9601808c925595eae7c4f8435da501898
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs customer-experience-v506.js customer-experience-v506.css /tmp/customer-experience-v506/
RUN node --check /tmp/customer-experience-v506/patch-runtime.mjs \
 && node --check /tmp/customer-experience-v506/verify-runtime.mjs \
 && node --check /tmp/customer-experience-v506/customer-experience-v506.js \
 && node /tmp/customer-experience-v506/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-experience-v506.js \
 && node /tmp/customer-experience-v506/verify-runtime.mjs \
 && rm -rf /tmp/customer-experience-v506

USER nextjs
