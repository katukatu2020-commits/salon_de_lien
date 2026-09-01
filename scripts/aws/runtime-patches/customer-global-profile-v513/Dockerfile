ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c3028a6b7812f3e2ffca24f8eb0af7efdbed7a4b81b454e8182a983744fe5e20
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-global-profile-v513.js audit-customer-global-profile-v513.mjs patch-runtime.mjs verify-runtime.mjs /tmp/lien-v513/
RUN node --check /tmp/lien-v513/customer-global-profile-v513.js \
 && node --check /tmp/lien-v513/audit-customer-global-profile-v513.mjs \
 && node --check /tmp/lien-v513/patch-runtime.mjs \
 && node --check /tmp/lien-v513/verify-runtime.mjs \
 && cp /tmp/lien-v513/customer-global-profile-v513.js /app/customer-global-profile-v513.js \
 && cp /tmp/lien-v513/audit-customer-global-profile-v513.mjs /app/audit-customer-global-profile-v513.mjs \
 && node /tmp/lien-v513/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-links-v293.js \
 && node --check /app/appointment-operations-v267.js \
 && node /tmp/lien-v513/verify-runtime.mjs \
 && rm -rf /tmp/lien-v513

USER nextjs
