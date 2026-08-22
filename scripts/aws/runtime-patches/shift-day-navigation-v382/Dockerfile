ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:admin-image-crop-v381
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/shift-day-navigation-v382/patch-runtime.mjs /tmp/patch-shift-day-navigation-v382.mjs
COPY scripts/aws/runtime-patches/shift-day-navigation-v382/verify-runtime.mjs /tmp/verify-shift-day-navigation-v382.mjs

RUN node /tmp/patch-shift-day-navigation-v382.mjs \
 && node /tmp/verify-shift-day-navigation-v382.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
