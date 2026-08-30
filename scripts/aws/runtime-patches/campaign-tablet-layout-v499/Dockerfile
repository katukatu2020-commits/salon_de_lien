ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:3a047f901a63aa4d1a520b15d51896442280a5d9e76ca6e74ec2b959084ac4cc
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v499/
RUN node --check /tmp/lien-v499/patch-runtime.mjs \
 && node --check /tmp/lien-v499/verify-runtime.mjs \
 && node /tmp/lien-v499/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-campaigns-v427.js \
 && node /tmp/lien-v499/verify-runtime.mjs \
 && rm -rf /tmp/lien-v499

USER nextjs
