ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:5574597f02016c3bbf0165298a2c7aa45be8b8e140e1e2207dfa35b99894f89f
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-global-profile-v512.js audit-customer-global-profile-v512.mjs patch-runtime.mjs verify-runtime.mjs /tmp/lien-v512/
RUN node --check /tmp/lien-v512/customer-global-profile-v512.js \
 && node --check /tmp/lien-v512/audit-customer-global-profile-v512.mjs \
 && node --check /tmp/lien-v512/patch-runtime.mjs \
 && node --check /tmp/lien-v512/verify-runtime.mjs \
 && cp /tmp/lien-v512/customer-global-profile-v512.js /app/customer-global-profile-v512.js \
 && cp /tmp/lien-v512/audit-customer-global-profile-v512.mjs /app/audit-customer-global-profile-v512.mjs \
 && node /tmp/lien-v512/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-links-v293.js \
 && node --check /app/appointment-operations-v267.js \
 && node /tmp/lien-v512/verify-runtime.mjs \
 && rm -rf /tmp/lien-v512

USER nextjs
