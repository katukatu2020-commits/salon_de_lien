ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-appointment-cancel-chat-side-v365
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/coupon-repeat-products-v366/customer-booking-coupon-v366.js /app/customer-booking-coupon-v366.js
COPY scripts/aws/runtime-patches/coupon-repeat-products-v366/customer-booking-coupon-client-v366.js /tmp/customer-booking-coupon-client-v366.js
COPY scripts/aws/runtime-patches/coupon-repeat-products-v366/patch-runtime.mjs /tmp/patch-coupon-repeat-products-v366.mjs
COPY scripts/aws/runtime-patches/coupon-repeat-products-v366/verify-runtime.mjs /tmp/verify-coupon-repeat-products-v366.mjs
COPY public/images/products/yohaku /app/public/images/products/yohaku

RUN node /tmp/patch-coupon-repeat-products-v366.mjs \
 && node --check /app/customer-booking-coupon-v366.js \
 && node --check /app/ui-workflows-v294.js \
 && node --check /app/server.js \
 && node /tmp/verify-coupon-repeat-products-v366.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
