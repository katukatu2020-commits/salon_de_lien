ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:sales-ledger-layout-navigation-v388
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/shift-staff-identity-v389/patch-runtime.mjs /tmp/patch-shift-staff-identity-v389.mjs
COPY scripts/aws/runtime-patches/shift-staff-identity-v389/verify-runtime.mjs /tmp/verify-shift-staff-identity-v389.mjs

RUN node /tmp/patch-shift-staff-identity-v389.mjs \
 && node /tmp/verify-shift-staff-identity-v389.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
