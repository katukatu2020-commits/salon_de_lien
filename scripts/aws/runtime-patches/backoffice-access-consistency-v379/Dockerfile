ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-community-mobile-shell-v378
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/backoffice-access-consistency-v379/patch-runtime.mjs /tmp/patch-backoffice-access-consistency-v379.mjs
COPY scripts/aws/runtime-patches/backoffice-access-consistency-v379/verify-runtime.mjs /tmp/verify-backoffice-access-consistency-v379.mjs

RUN node /tmp/patch-backoffice-access-consistency-v379.mjs \
 && node /tmp/verify-backoffice-access-consistency-v379.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
