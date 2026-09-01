ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:8e74d71d5de833e80256d00c75dc133cc6a19991598e8aaec89c8259e8e96745
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY broadcast-layout-v510.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v510/
RUN node --check /tmp/lien-v510/broadcast-layout-v510.js \
 && node --check /tmp/lien-v510/patch-runtime.mjs \
 && node --check /tmp/lien-v510/verify-runtime.mjs \
 && node --check /tmp/lien-v510/test-runtime.mjs \
 && node /tmp/lien-v510/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/lien-v510/verify-runtime.mjs \
 && LIEN_BROADCAST_LAYOUT_CLIENT=/app/public/broadcast-layout-v510.js node /tmp/lien-v510/test-runtime.mjs \
 && rm -rf /tmp/lien-v510

USER nextjs
