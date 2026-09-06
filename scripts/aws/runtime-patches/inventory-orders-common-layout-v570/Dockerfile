ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:50affe42e9d3ac122bd448c92b3810ecfd97f4b08658af146182e20f1a5f97af
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY inventory-orders-common-layout-v570.js inventory-orders-common-layout-v570.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v570/

RUN node --check /tmp/lien-v570/inventory-orders-common-layout-v570.js \
 && node --check /tmp/lien-v570/patch-runtime.mjs \
 && node --check /tmp/lien-v570/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v570/patch-runtime.mjs \
 && node --check /app/public/inventory-orders-common-layout-v570.js \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node --check /app/wholesale-ordering-v543.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v570/verify-runtime.mjs \
 && rm -rf /tmp/lien-v570

USER nextjs
