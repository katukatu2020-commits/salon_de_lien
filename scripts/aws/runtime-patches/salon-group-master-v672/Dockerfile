ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d4ee9b4d5e72d0e0bba834d65fe6758022afcbc5cef5631d9e90c9aedebb46b3
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v672/
RUN node --check /tmp/lien-v672/salon-group-master-v672.js \
 && node --check /tmp/lien-v672/salon-group-master-v672-page.js \
 && node --check /tmp/lien-v672/salon-group-master-v672-client.js \
 && node /tmp/lien-v672/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/lien-v672/verify-runtime.mjs
USER nextjs
