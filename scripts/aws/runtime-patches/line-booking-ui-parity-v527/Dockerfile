ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d58811b03a8486349e19bb6edb4cf0a33cd505e1c638a1c7ffbd07a132296e7e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY line-booking-page-v527.js line-booking-page-v527.html patch-runtime.mjs verify-runtime.mjs test-week-availability.cjs /tmp/lien-v527/

RUN node --check /tmp/lien-v527/line-booking-page-v527.js \
 && node --check /tmp/lien-v527/patch-runtime.mjs \
 && node --check /tmp/lien-v527/verify-runtime.mjs \
 && node --check /tmp/lien-v527/test-week-availability.cjs \
 && node /tmp/lien-v527/patch-runtime.mjs \
 && node --check /app/line-reservations-v436.js \
 && node --check /app/line-booking-page-v527.js \
 && node /tmp/lien-v527/verify-runtime.mjs \
 && LIEN_LINE_RESERVATIONS_MODULE=/app/line-reservations-v436.js node /tmp/lien-v527/test-week-availability.cjs \
 && rm -rf /tmp/lien-v527

USER nextjs
