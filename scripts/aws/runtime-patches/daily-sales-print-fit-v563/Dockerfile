ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ecad16fa36abd6eb9fd750a9a19f066bca41d51b7b9044974cd73cfa208d183c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY daily-sales-print-fit-v563.css daily-sales-print-fit-v563.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v563/

RUN node --check /tmp/lien-v563/daily-sales-print-fit-v563.js \
 && node --check /tmp/lien-v563/patch-runtime.mjs \
 && node --check /tmp/lien-v563/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v563/patch-runtime.mjs \
 && node --check /app/public/daily-sales-print-fit-v563.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v563/verify-runtime.mjs \
 && rm -rf /tmp/lien-v563

USER nextjs
