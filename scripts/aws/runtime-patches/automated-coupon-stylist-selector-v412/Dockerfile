ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:db3eb85518b113c81e2edf44ec97f92ca7fb04907ae0eaf4a55f3db26f45f6ff
FROM ${BASE_IMAGE}

USER root
COPY patch-runtime.mjs /tmp/patch-automated-coupon-stylist-selector-v412.mjs
COPY automated-coupon-fields-v412.js /app/public/automated-coupon-fields-v412.js
COPY verify-runtime.mjs /tmp/verify-automated-coupon-stylist-selector-v412.mjs
RUN node --check /app/public/automated-coupon-fields-v412.js \
  && node /tmp/patch-automated-coupon-stylist-selector-v412.mjs \
  && node /tmp/verify-automated-coupon-stylist-selector-v412.mjs
USER nextjs
