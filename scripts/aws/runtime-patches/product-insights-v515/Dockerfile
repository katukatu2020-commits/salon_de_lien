ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:113cb55f3e531d98a9e796e5886eb928b3d74cdf25284e219844ae3802707bf5
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY product-insights-v515.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v515/
RUN node --check /tmp/lien-v515/product-insights-v515.js \
 && node --check /tmp/lien-v515/patch-runtime.mjs \
 && node --check /tmp/lien-v515/verify-runtime.mjs \
 && node /tmp/lien-v515/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/.next/server/chunks/6006.js \
 && node --check /app/public/product-insights-v515.js \
 && node --check /app/.next/static/chunks/app/layout-runtime-v515.js \
 && node /tmp/lien-v515/verify-runtime.mjs \
 && rm -rf /tmp/lien-v515

USER nextjs
