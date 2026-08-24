ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:36caa1f58fcc3adcf0cfb36d7471cf269566dbc4142f434dea9983b731bf5469
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY booking-availability-v430.js /app/booking-availability-v430.js
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v430/
RUN node --check /app/booking-availability-v430.js \
 && node --check /tmp/lien-v430/patch-runtime.mjs \
 && node /tmp/lien-v430/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/tenant-setup.js \
 && node --check /app/store-profile.js \
 && node --check /app/tenant-setup-client.js \
 && node /tmp/lien-v430/verify-runtime.mjs \
 && rm -rf /tmp/lien-v430

USER nextjs
