ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v613/
RUN node /tmp/lien-v613/verify-runtime.mjs snapshot \
 && node /tmp/lien-v613/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/.next/server/app/admin/customers/messages/page.js \
 && node --check /app/public/coupon-email-delivery-v613.js \
 && node /tmp/lien-v613/verify-runtime.mjs \
 && node /tmp/lien-v613/integration.mjs
USER nextjs
