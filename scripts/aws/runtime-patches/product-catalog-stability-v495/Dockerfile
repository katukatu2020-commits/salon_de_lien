ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d18c4b78a17181789cc6422cce0ee84ec2e8cf5c3fcff94bff6db0bfec92a802
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v495/
RUN node --check /tmp/lien-v495/patch-runtime.mjs \
 && node --check /tmp/lien-v495/verify-runtime.mjs \
 && node --check /tmp/lien-v495/test-runtime.mjs \
 && node /tmp/lien-v495/patch-runtime.mjs \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/admin-staff-experience-v276.js \
 && node /tmp/lien-v495/verify-runtime.mjs \
 && node /tmp/lien-v495/test-runtime.mjs \
 && rm -rf /tmp/lien-v495

USER nextjs
