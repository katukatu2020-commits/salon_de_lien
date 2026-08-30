ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b0d3cb2bc3970906c9b3dd6aa44f1ca2edf8caceb21b4c3a3f72f5de016d5bf9
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY attendance-history-editor-v497.js /app/attendance-history-editor-v497.js
COPY attendance-client-v497.js /app/attendance-client-v497.js
COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v497/
RUN node --check /app/attendance-history-editor-v497.js \
 && node --check /app/attendance-client-v497.js \
 && node --check /tmp/lien-v497/patch-runtime.mjs \
 && node --check /tmp/lien-v497/verify-runtime.mjs \
 && node --check /tmp/lien-v497/test-runtime.mjs \
 && node /tmp/lien-v497/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node /tmp/lien-v497/verify-runtime.mjs \
 && node /tmp/lien-v497/test-runtime.mjs \
 && rm -rf /tmp/lien-v497

USER nextjs
