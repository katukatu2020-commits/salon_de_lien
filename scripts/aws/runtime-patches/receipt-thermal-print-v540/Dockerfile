ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:26b0dd18b5572fa93eb65b7c9c595c95284a7c8b0fe22e9637b5e6ae26e2ecaa
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY receipt-thermal-print-v540.css receipt-thermal-print-v540.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v540/

RUN node --check /tmp/lien-v540/receipt-thermal-print-v540.js \
 && node --check /tmp/lien-v540/patch-runtime.mjs \
 && node --check /tmp/lien-v540/verify-runtime.mjs \
 && node /tmp/lien-v540/patch-runtime.mjs \
 && node --check /app/public/receipt-thermal-print-v540.js \
 && node --check /app/public/shell-consistency-v518.js \
 && node --check /app/server.js \
 && node /tmp/lien-v540/verify-runtime.mjs \
 && rm -rf /tmp/lien-v540

USER nextjs
