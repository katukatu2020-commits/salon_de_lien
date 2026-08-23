ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:store-icon-tenant-isolation-v397
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/sales-ledger-scroll-print-v398/patch-runtime.mjs /tmp/patch-sales-ledger-scroll-print-v398.mjs
COPY scripts/aws/runtime-patches/sales-ledger-scroll-print-v398/verify-runtime.mjs /tmp/verify-sales-ledger-scroll-print-v398.mjs

RUN node /tmp/patch-sales-ledger-scroll-print-v398.mjs \
 && node /tmp/verify-sales-ledger-scroll-print-v398.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs

