ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:sales-ledger-theme-v390
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/community-desktop-aspect-v391/patch-runtime.mjs /tmp/patch-community-desktop-aspect-v391.mjs
COPY scripts/aws/runtime-patches/community-desktop-aspect-v391/verify-runtime.mjs /tmp/verify-community-desktop-aspect-v391.mjs

RUN node /tmp/patch-community-desktop-aspect-v391.mjs \
 && node /tmp/verify-community-desktop-aspect-v391.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
