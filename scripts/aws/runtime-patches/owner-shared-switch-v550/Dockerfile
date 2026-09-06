ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:5ebba4a882fc377c935491c3d039bf719b89ddd775f34fcda7f8b22f5b24c857
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY owner-shared-switch-v550.js owner-shared-switch-client-v550.js owner-shared-switch-v550.css patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v550/

RUN node --check /tmp/lien-v550/owner-shared-switch-v550.js \
 && node --check /tmp/lien-v550/owner-shared-switch-client-v550.js \
 && node --check /tmp/lien-v550/patch-runtime.mjs \
 && node --check /tmp/lien-v550/verify-runtime.mjs \
 && node --check /tmp/lien-v550/test-runtime.mjs \
 && node /tmp/lien-v550/test-runtime.mjs \
 && node /tmp/lien-v550/patch-runtime.mjs \
 && node --check /app/owner-shared-switch-v550.js \
 && node --check /app/public/owner-shared-switch-v550.js \
 && node --check /app/server.js \
 && node /tmp/lien-v550/verify-runtime.mjs \
 && rm -rf /tmp/lien-v550

USER nextjs
