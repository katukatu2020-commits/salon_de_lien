ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:45b16ea6b62a5c0ac12d3f42500ba8fd7a343f4383401080fced4552e1360354
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-management-v469.js /app/content-management-v465.js
COPY content-edit-delete-client-v469.js /app/
COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs smoke-production.mjs /tmp/lien-v469/
RUN node --check /app/content-management-v465.js \
 && node --check /app/content-edit-delete-client-v469.js \
 && node --check /tmp/lien-v469/patch-runtime.mjs \
 && node --check /tmp/lien-v469/verify-runtime.mjs \
 && node --check /tmp/lien-v469/test-runtime.mjs \
 && node --check /tmp/lien-v469/smoke-production.mjs \
 && node /tmp/lien-v469/patch-runtime.mjs \
 && node /tmp/lien-v469/verify-runtime.mjs \
 && LIEN_CONTENT_SERVICE=/app/content-management-v465.js node /tmp/lien-v469/test-runtime.mjs \
 && rm -rf /tmp/lien-v469

USER nextjs
