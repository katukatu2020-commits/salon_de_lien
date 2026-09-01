ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:8a62234ba3abf80b494a2b6d11e3a5eb0afb847d701f0e3800fa73f09bfd65d4
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs service-smoke.mjs /tmp/lien-v532/

RUN node --check /tmp/lien-v532/patch-runtime.mjs \
 && node --check /tmp/lien-v532/verify-runtime.mjs \
 && node --check /tmp/lien-v532/service-smoke.mjs \
 && node /tmp/lien-v532/patch-runtime.mjs \
 && node --check /app/customer-store-staff-v276.js \
 && node --check /app/customer-withdrawal-v309.js \
 && node --check /app/server.js \
 && node /tmp/lien-v532/verify-runtime.mjs \
 && node /tmp/lien-v532/service-smoke.mjs \
 && rm -rf /tmp/lien-v532

USER nextjs
