ARG BASE_IMAGE=salon-de-lien:business-days-customer-staff-v328
FROM ${BASE_IMAGE}

USER root

COPY stylist-auto-coupon-v330/patch-runtime.mjs /tmp/stylist-auto-coupon-v330.mjs
COPY stylist-auto-coupon-v330/verify-runtime.mjs /tmp/verify-stylist-auto-coupon-v330.mjs
COPY stylist-auto-coupon-v330/automated-coupon-fields-v330.js /app/public/automated-coupon-fields-v330.js

RUN node /tmp/stylist-auto-coupon-v330.mjs \
 && node /tmp/verify-stylist-auto-coupon-v330.mjs \
 && node --check /app/server.js

USER nextjs
