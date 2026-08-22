ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:backoffice-access-consistency-v379
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-appointment-cancel-chat-side-v362/customer-appointment-cancellation-v362.js /app/customer-appointment-cancellation-v362.js
COPY scripts/aws/runtime-patches/customer-cancellation-resilience-v380/verify-runtime.mjs /tmp/verify-customer-cancellation-resilience-v380.mjs
COPY scripts/aws/runtime-patches/customer-cancellation-resilience-v380/test-service.mjs /tmp/test-customer-cancellation-resilience-v380.mjs

RUN node /tmp/verify-customer-cancellation-resilience-v380.mjs \
 && node /tmp/test-customer-cancellation-resilience-v380.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
