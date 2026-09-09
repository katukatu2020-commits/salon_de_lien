ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:3ad5b2a8a341f0a58fc6af9b7e502e952106a5c5862bf34e69de845e1e76c586
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY daily-sales-print-v590.js daily-sales-print-v590.css ./public/
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v590/
RUN node /tmp/lien-v590/verify-runtime.mjs snapshot \
 && node /tmp/lien-v590/patch-runtime.mjs \
 && node --check server.js \
 && node --check public/daily-sales-print-v590.js \
 && node /tmp/lien-v590/verify-runtime.mjs
USER nextjs
