ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:2d0efb38045850171a85893d76b65e191ba98e739f6f6f6a17c44a83e84f5911
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY manual-break-booking-v521.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v521/

RUN node --check /tmp/lien-v521/manual-break-booking-v521.js \
 && node --check /tmp/lien-v521/patch-runtime.mjs \
 && node --check /tmp/lien-v521/verify-runtime.mjs \
 && node /tmp/lien-v521/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/staff-breaks-checkout-menu-v442.js \
 && node --check /app/staff-breaks-checkout-menu-client-v442.js \
 && node /tmp/lien-v521/verify-runtime.mjs \
 && rm -rf /tmp/lien-v521

USER nextjs
