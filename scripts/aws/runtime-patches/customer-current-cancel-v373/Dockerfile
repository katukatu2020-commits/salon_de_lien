ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:free-pool-capacity-v372
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-current-cancel-v373/customer-current-cancel-v373.js /tmp/customer-current-cancel-v373.js
COPY scripts/aws/runtime-patches/customer-current-cancel-v373/patch-runtime.mjs /tmp/patch-customer-current-cancel-v373.mjs
COPY scripts/aws/runtime-patches/customer-current-cancel-v373/verify-runtime.mjs /tmp/verify-customer-current-cancel-v373.mjs

RUN node /tmp/patch-customer-current-cancel-v373.mjs \
 && node --check /app/public/customer-current-cancel-v373.js \
 && node /tmp/verify-customer-current-cancel-v373.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
