ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:shift-day-navigation-v382
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/community-image-aspect-v383/patch-runtime.mjs /tmp/patch-community-image-aspect-v383.mjs
COPY scripts/aws/runtime-patches/community-image-aspect-v383/verify-runtime.mjs /tmp/verify-community-image-aspect-v383.mjs

RUN node /tmp/patch-community-image-aspect-v383.mjs \
 && node /tmp/verify-community-image-aspect-v383.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
