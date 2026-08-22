ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-community-mobile-layout-v367
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/sales-ledger-accounts-v318/sales-ledger-client-v318.js /app/sales-ledger-client-v318.js
COPY scripts/aws/runtime-patches/shared-account-save-v368/verify-runtime.cjs /tmp/verify-shared-account-save-v368.cjs

RUN node --check /app/sales-ledger-client-v318.js \
 && node /tmp/verify-shared-account-save-v368.cjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
