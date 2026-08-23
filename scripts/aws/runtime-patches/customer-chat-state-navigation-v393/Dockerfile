ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:reservation-financial-breakdown-v392
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-chat-state-navigation-v393/patch-runtime.mjs /tmp/patch-customer-chat-state-navigation-v393.mjs
COPY scripts/aws/runtime-patches/customer-chat-state-navigation-v393/verify-runtime.mjs /tmp/verify-customer-chat-state-navigation-v393.mjs

RUN node /tmp/patch-customer-chat-state-navigation-v393.mjs \
 && node /tmp/verify-customer-chat-state-navigation-v393.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
