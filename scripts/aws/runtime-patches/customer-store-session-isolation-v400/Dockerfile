ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:3a6b6394379bd29c56795e11f280b146a3b966825eeeab8216a35ffe8bff59f1
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-store-session-isolation-v400/patch-runtime.mjs /tmp/patch-customer-store-session-isolation-v400.mjs
COPY scripts/aws/runtime-patches/customer-store-session-isolation-v400/verify-runtime.mjs /tmp/verify-customer-store-session-isolation-v400.mjs

RUN node /tmp/patch-customer-store-session-isolation-v400.mjs \
 && node /tmp/verify-customer-store-session-isolation-v400.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
