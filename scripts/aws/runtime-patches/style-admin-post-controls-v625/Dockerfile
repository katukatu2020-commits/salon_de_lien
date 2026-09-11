ARG BASE_IMAGE=salon-de-lien:style-admin-post-controls-v625-local
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs style-admin-post-controls-v625.js style-admin-post-controls-v625.css /tmp/lien-v625/

RUN node --check /tmp/lien-v625/patch-runtime.mjs \
 && node --check /tmp/lien-v625/verify-runtime.mjs \
 && node --check /tmp/lien-v625/style-admin-post-controls-v625.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v625/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/style-admin-controls-v618.js \
 && node --check /app/public/style-admin-controls-v618.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v625/verify-runtime.mjs

USER nextjs
