ARG BASE_IMAGE=salon-de-lien:campaign-coupon-confirm-v706-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v707
RUN node /tmp/lien-v707/patch-runtime.cjs \
 && node --check /app/.next/server/chunks/3491.js \
 && node --check /app/server.js \
 && node /tmp/lien-v707/verify-runtime.mjs \
 && node --test /tmp/lien-v707/customer-kana.test.cjs
USER nextjs
