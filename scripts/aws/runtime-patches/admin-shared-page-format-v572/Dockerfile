ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c2ce6eeb3ec9f9973343309e144209b6df01efdcdb8e11395e8739e756e9ecdd
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY admin-workspace-layout-v572.js admin-workspace-layout-v572.css inventory-orders-common-layout-v572.js inventory-orders-common-layout-v572.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v572/

RUN node --check /tmp/lien-v572/admin-workspace-layout-v572.js \
 && node --check /tmp/lien-v572/inventory-orders-common-layout-v572.js \
 && node --check /tmp/lien-v572/patch-runtime.mjs \
 && node --check /tmp/lien-v572/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v572/patch-runtime.mjs \
 && node --check /app/public/admin-workspace-layout-v572.js \
 && node --check /app/public/inventory-orders-common-layout-v572.js \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v572/verify-runtime.mjs \
 && rm -rf /tmp/lien-v572

USER nextjs
