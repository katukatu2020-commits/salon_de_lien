ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-community-content-height-v375
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY public/customer-community-mobile-v376.js /app/customer-community-mobile-v376.js
COPY scripts/aws/runtime-patches/customer-community-mobile-runtime-v376/patch-runtime.mjs /tmp/patch-customer-community-mobile-runtime-v376.mjs
COPY scripts/aws/runtime-patches/customer-community-mobile-runtime-v376/verify-runtime.mjs /tmp/verify-customer-community-mobile-runtime-v376.mjs

RUN node /tmp/patch-customer-community-mobile-runtime-v376.mjs \
 && node /tmp/verify-customer-community-mobile-runtime-v376.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
