ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:9aa101078eb060410a45573afd3c4ac7ff4498752c048760d256eac7873ef49f
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v498/
RUN node --check /tmp/lien-v498/patch-runtime.mjs \
 && node --check /tmp/lien-v498/verify-runtime.mjs \
 && node --check /tmp/lien-v498/test-runtime.mjs \
 && node /tmp/lien-v498/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-campaigns-v427.js \
 && node --check /app/commercial-admin-v101.js \
 && node /tmp/lien-v498/verify-runtime.mjs \
 && node /tmp/lien-v498/test-runtime.mjs \
 && rm -rf /tmp/lien-v498

USER nextjs
