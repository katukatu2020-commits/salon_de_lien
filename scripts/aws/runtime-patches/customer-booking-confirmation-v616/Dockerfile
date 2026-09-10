ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v616/
RUN node /tmp/lien-v616/verify-runtime.mjs snapshot \
 && node /tmp/lien-v616/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/customer-booking-confirmation-v616.js \
 && node --check /app/customer-booking-coupon-v616.js \
 && node --check /app/customer-appointment-cancellation-v616.js \
 && node /tmp/lien-v616/verify-runtime.mjs
USER nextjs
