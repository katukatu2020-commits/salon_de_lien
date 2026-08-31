ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d81a1ee9e8a2e6f77e5cfe29960938cdd3d052455f605788dfd2fc89bfe67446
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs customer-experience-v508.js customer-experience-v508.css /tmp/customer-experience-v508/
RUN node --check /tmp/customer-experience-v508/patch-runtime.mjs \
 && node --check /tmp/customer-experience-v508/verify-runtime.mjs \
 && node --check /tmp/customer-experience-v508/customer-experience-v508.js \
 && node /tmp/customer-experience-v508/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-experience-v508.js \
 && node /tmp/customer-experience-v508/verify-runtime.mjs \
 && rm -rf /tmp/customer-experience-v508

USER nextjs
