ARG BASE_IMAGE=salon-de-lien:platform-store-customer-visibility-v354
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/platform-customer-login-id-v355/patch-runtime.mjs /tmp/patch-platform-customer-login-id-v355.mjs
COPY scripts/aws/runtime-patches/platform-customer-login-id-v355/verify-runtime.mjs /tmp/verify-platform-customer-login-id-v355.mjs

RUN node /tmp/patch-platform-customer-login-id-v355.mjs \
 && node --check /app/platform-operator.js \
 && node /tmp/verify-platform-customer-login-id-v355.mjs

USER nextjs
