ARG BASE_IMAGE=salon-de-lien:community-publish-header-v337
FROM ${BASE_IMAGE}

USER root

COPY shift-empty-cell-drop-v338/patch-runtime.mjs /tmp/shift-empty-cell-drop-v338.mjs
COPY shift-empty-cell-drop-v338/verify-runtime.mjs /tmp/verify-shift-empty-cell-drop-v338.mjs

RUN node /tmp/shift-empty-cell-drop-v338.mjs \
 && node /tmp/verify-shift-empty-cell-drop-v338.mjs \
 && node --check /app/server.js

USER nextjs
