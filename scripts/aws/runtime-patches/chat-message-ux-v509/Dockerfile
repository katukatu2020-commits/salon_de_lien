ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b11977d91b1d46df84bdb576b386d7e1dcecc833634c09597d0797d2f19bbb7b
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-edit-delete-client-v509.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v509/
RUN node --check /tmp/lien-v509/content-edit-delete-client-v509.js \
 && node --check /tmp/lien-v509/patch-runtime.mjs \
 && node --check /tmp/lien-v509/verify-runtime.mjs \
 && node --check /tmp/lien-v509/test-runtime.mjs \
 && node /tmp/lien-v509/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/lien-v509/verify-runtime.mjs \
 && LIEN_CHAT_UX_CLIENT=/app/public/content-edit-delete-client-v509.js node /tmp/lien-v509/test-runtime.mjs \
 && rm -rf /tmp/lien-v509

USER nextjs
