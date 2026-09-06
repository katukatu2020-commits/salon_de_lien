ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ceb1cc42d3de60b2e21cc3b51f4bbcc7a523fd8c0c3abf0216b0dc4e120abc4f
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY receipt-roll-print-v569.css receipt-roll-print-v569.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v569/

RUN node --check /tmp/lien-v569/receipt-roll-print-v569.js \
 && node --check /tmp/lien-v569/patch-runtime.mjs \
 && node --check /tmp/lien-v569/verify-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v569/patch-runtime.mjs \
 && node --check /app/public/receipt-roll-print-v569.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v569/verify-runtime.mjs \
 && rm -rf /tmp/lien-v569

USER nextjs
