ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-current-cancel-v373
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-current-cancel-v374/patch-runtime.mjs /tmp/patch-customer-current-cancel-v374.mjs
COPY scripts/aws/runtime-patches/customer-current-cancel-v374/verify-runtime.mjs /tmp/verify-customer-current-cancel-v374.mjs

RUN node /tmp/patch-customer-current-cancel-v374.mjs \
 && node /tmp/verify-customer-current-cancel-v374.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
