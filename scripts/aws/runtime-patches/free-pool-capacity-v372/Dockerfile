ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-appointment-cancel-v371
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/free-pool-capacity-v372/patch-runtime.mjs /tmp/patch-free-pool-capacity-v372.mjs
COPY scripts/aws/runtime-patches/free-pool-capacity-v372/verify-runtime.mjs /tmp/verify-free-pool-capacity-v372.mjs

RUN node /tmp/patch-free-pool-capacity-v372.mjs \
 && node /tmp/verify-free-pool-capacity-v372.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
