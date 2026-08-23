ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:shift-staff-availability-v387
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/sales-ledger-accounts-v318/sales-ledger-client-v318.js /app/sales-ledger-client-v318.js
COPY scripts/aws/runtime-patches/sales-ledger-layout-navigation-v388/patch-ui-workflows.mjs /tmp/patch-ui-workflows-v388.mjs
COPY scripts/aws/runtime-patches/sales-ledger-layout-navigation-v388/verify-runtime.mjs /tmp/verify-sales-ledger-layout-navigation-v388.mjs

RUN node /tmp/patch-ui-workflows-v388.mjs \
 && node /tmp/verify-sales-ledger-layout-navigation-v388.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]
USER nextjs
