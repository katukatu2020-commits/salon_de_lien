ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v644/

RUN node --check /tmp/lien-v644/patch-runtime.mjs \
 && node --check /tmp/lien-v644/stamp-booking-rewards-v644.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v644/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/stamp-booking-rewards-v644.js \
 && node --check /app/customer-booking-coupon-v616.js \
 && node --check /app/public/customer-booking-confirmation-v616.js \
 && node --check /app/public/customer-journey-v601.js \
 && node --check /app/customer-experience-v508.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v644/verify-runtime.mjs

USER nextjs
