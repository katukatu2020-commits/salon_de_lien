ARG BASE_IMAGE
FROM ${BASE_IMAGE}
ARG PATCH_MODE=full

USER root
WORKDIR /app

COPY . /tmp/lien-v629/

RUN node --check /tmp/lien-v629/managed-account-access-v629.js \
 && node --check /tmp/lien-v629/migrate-existing-billing.mjs \
 && node --check /tmp/lien-v629/migration-fixture.mjs \
 && node --check /tmp/lien-v629/patch-runtime.mjs \
 && node /tmp/lien-v629/migration-fixture.mjs \
 && if [ "$PATCH_MODE" = "hotfix" ]; then cp /tmp/lien-v629/managed-account-access-v629.js /app/managed-account-access-v629.js; else LIEN_RUNTIME_ROOT=/app node /tmp/lien-v629/patch-runtime.mjs; fi \
 && node --check /app/server.js \
 && node --check /app/billing.js \
 && node --check /app/audience-sites.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/wholesale-ordering-client-v543.js \
 && node --check /app/managed-account-access-v629.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v629/verify-runtime.mjs

USER nextjs
