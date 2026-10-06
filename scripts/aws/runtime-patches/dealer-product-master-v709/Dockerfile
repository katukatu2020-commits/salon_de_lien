ARG BASE_IMAGE=salon-de-lien:private-treatment-comments-v708-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v709
RUN node /tmp/lien-v709/patch-runtime.cjs \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/dealer-workspace-v688.js \
 && node --check /app/public/dealer-product-master-v709.js \
 && node --check /app/dealer-product-master-v709/catalog.cjs \
 && node /tmp/lien-v709/verify-runtime.mjs \
 && node --test /tmp/lien-v709/unit.test.cjs
USER nextjs
