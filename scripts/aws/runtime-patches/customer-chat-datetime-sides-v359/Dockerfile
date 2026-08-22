ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:community-prisma-consistency-v358
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-chat-datetime-sides-v359/patch-runtime.mjs /tmp/patch-customer-chat-datetime-sides-v359.mjs
COPY scripts/aws/runtime-patches/customer-chat-datetime-sides-v359/verify-runtime.mjs /tmp/verify-customer-chat-datetime-sides-v359.mjs

RUN node /tmp/patch-customer-chat-datetime-sides-v359.mjs \
 && node --check /app/ui-workflows-v294.js \
 && node /tmp/verify-customer-chat-datetime-sides-v359.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
