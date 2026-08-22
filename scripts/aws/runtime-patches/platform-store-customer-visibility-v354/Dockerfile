ARG BASE_IMAGE=salon-de-lien:store-customer-visibility-v353
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/platform-store-customer-visibility-v354/patch-runtime.mjs /tmp/patch-platform-store-customer-visibility-v354.mjs
COPY scripts/aws/runtime-patches/platform-store-customer-visibility-v354/verify-runtime.mjs /tmp/verify-platform-store-customer-visibility-v354.mjs

RUN node /tmp/patch-platform-store-customer-visibility-v354.mjs \
 && node --check /app/platform-operator.js \
 && node /tmp/verify-platform-store-customer-visibility-v354.mjs

USER nextjs
