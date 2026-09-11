ARG BASE_IMAGE=salon-de-lien:style-admin-post-controls-v625-list-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs style-detail-management-removal-v626.js /tmp/lien-v626/

RUN node --check /tmp/lien-v626/patch-runtime.mjs \
 && node --check /tmp/lien-v626/verify-runtime.mjs \
 && node --check /tmp/lien-v626/style-detail-management-removal-v626.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v626/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/content-edit-delete-client-v615.js \
 && node --check /app/public/style-admin-controls-v618.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v626/verify-runtime.mjs

USER nextjs
