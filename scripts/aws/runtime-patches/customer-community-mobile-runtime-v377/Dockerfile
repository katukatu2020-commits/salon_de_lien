ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-community-mobile-runtime-v376
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY public/customer-community-mobile-v377.js /app/public/customer-community-mobile-v377.js
COPY scripts/aws/runtime-patches/customer-community-mobile-runtime-v377/patch-runtime.mjs /tmp/patch-customer-community-mobile-runtime-v377.mjs
COPY scripts/aws/runtime-patches/customer-community-mobile-runtime-v377/verify-runtime.mjs /tmp/verify-customer-community-mobile-runtime-v377.mjs

RUN node /tmp/patch-customer-community-mobile-runtime-v377.mjs \
 && node /tmp/verify-customer-community-mobile-runtime-v377.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
