ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:community-desktop-aspect-v391
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/reservation-financial-breakdown-v392/patch-runtime.mjs /tmp/patch-reservation-financial-breakdown-v392.mjs
COPY scripts/aws/runtime-patches/reservation-financial-breakdown-v392/verify-runtime.mjs /tmp/verify-reservation-financial-breakdown-v392.mjs

RUN node /tmp/patch-reservation-financial-breakdown-v392.mjs \
 && node /tmp/verify-reservation-financial-breakdown-v392.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
