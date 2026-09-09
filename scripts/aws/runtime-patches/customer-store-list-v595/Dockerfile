ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:461ecb1fa8eb75a8c1b88bf1d9f79127eca2375b1cbdc1dc4f22c74ae7978707
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY customer-store-list-v595.js ./
COPY patch-runtime.mjs verify-runtime.mjs integration.mjs /tmp/lien-v595/
RUN node /tmp/lien-v595/verify-runtime.mjs snapshot \
 && node /tmp/lien-v595/patch-runtime.mjs \
 && node --check customer-links-v293.js \
 && node --check customer-merge-v385.js \
 && node --check customer-store-list-v595.js \
 && node --check server.js \
 && node /tmp/lien-v595/verify-runtime.mjs
USER nextjs
