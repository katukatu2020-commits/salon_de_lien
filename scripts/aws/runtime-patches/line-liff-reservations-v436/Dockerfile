ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:dc9dd3714e15bbd0eb6f8673ae07b1155d35495dabf88a97528140ecf9f3b5a5
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY line-reservations-v436.js line-settings-client-v436.js /app/
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v436/
RUN node --check /app/line-reservations-v436.js \
 && node --check /app/line-settings-client-v436.js \
 && node --check /tmp/lien-v436/patch-runtime.mjs \
 && node /tmp/lien-v436/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/ui-workflows-v294.js \
 && node --check /app/commercial-admin-v101.js \
 && node /tmp/lien-v436/verify-runtime.mjs \
 && rm -rf /tmp/lien-v436

USER nextjs
