ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:coupon-repeat-products-v366
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-community-mobile-layout-v367/patch-runtime.mjs /tmp/patch-customer-community-mobile-layout-v367.mjs
COPY scripts/aws/runtime-patches/customer-community-mobile-layout-v367/verify-runtime.mjs /tmp/verify-customer-community-mobile-layout-v367.mjs

RUN node /tmp/patch-customer-community-mobile-layout-v367.mjs \
 && node /tmp/verify-customer-community-mobile-layout-v367.mjs \
 && node --check '/app/.next/server/app/u/(account)/community/[postId]/page.js'

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
