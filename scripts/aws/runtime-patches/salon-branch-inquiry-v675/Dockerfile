ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ff9e6c29c9dbaaaa8cba9b4609165cc08d4c5681d6cf3bbeba9d458057313e11
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v675/
RUN node /tmp/lien-v675/patch-runtime.mjs \
 && node --check /app/salon-group-master-v672.js \
 && node --check /app/salon-group-master-v672-page.js \
 && node --check /app/salon-group-master-v672-client.js \
 && node --check /app/salon-branch-inquiry-v675.js \
 && node --check /app/business-account-approvals-v643.js \
 && node --check /app/server.js \
 && node /tmp/lien-v675/verify-runtime.mjs
USER nextjs
