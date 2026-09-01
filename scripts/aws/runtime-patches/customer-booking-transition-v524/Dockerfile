ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:13c77d76b8cf283baac3fff85fed540f50e59ba786ec614558b750f37fdf39a2
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-booking-transition-v524.css customer-booking-transition-v524.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v524/

RUN node --check /tmp/lien-v524/patch-runtime.mjs \
 && node --check /tmp/lien-v524/verify-runtime.mjs \
 && node /tmp/lien-v524/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/lien-v524/verify-runtime.mjs \
 && rm -rf /tmp/lien-v524

USER nextjs
