ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:bcbb95985763598e13ebeeacb3e288a776a27aea1b9f2e6b71537f721abc5460
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-chart-header-actions-v575.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v575/

RUN node --check /tmp/lien-v575/patch-runtime.mjs \
 && node --check /tmp/lien-v575/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v575/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v575/verify-runtime.mjs \
 && rm -rf /tmp/lien-v575

USER nextjs
