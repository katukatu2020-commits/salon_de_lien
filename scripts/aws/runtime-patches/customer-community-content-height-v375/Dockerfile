ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-current-cancel-v374
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-community-content-height-v375/patch-runtime.mjs /tmp/patch-customer-community-content-height-v375.mjs
COPY scripts/aws/runtime-patches/customer-community-content-height-v375/verify-runtime.mjs /tmp/verify-customer-community-content-height-v375.mjs

RUN node /tmp/patch-customer-community-content-height-v375.mjs \
 && node /tmp/verify-customer-community-content-height-v375.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
