ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:shift-staff-identity-v389
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/sales-ledger-accounts-v318/sales-ledger-client-v318.js /app/sales-ledger-client-v318.js
COPY scripts/aws/runtime-patches/sales-ledger-theme-v390/verify-runtime.mjs /tmp/verify-sales-ledger-theme-v390.mjs

RUN node /tmp/verify-sales-ledger-theme-v390.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
