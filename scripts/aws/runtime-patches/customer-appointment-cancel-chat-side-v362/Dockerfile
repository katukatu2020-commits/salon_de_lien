ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-community-mobile-spacing-v361
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-appointment-cancel-chat-side-v362/customer-appointment-cancellation-v362.js /app/customer-appointment-cancellation-v362.js
COPY scripts/aws/runtime-patches/customer-appointment-cancel-chat-side-v362/customer-appointment-cancel-client-v362.js /tmp/customer-appointment-cancel-client-v362.js
COPY scripts/aws/runtime-patches/customer-appointment-cancel-chat-side-v362/patch-runtime.mjs /tmp/patch-customer-appointment-cancel-chat-side-v362.mjs
COPY scripts/aws/runtime-patches/customer-appointment-cancel-chat-side-v362/verify-runtime.mjs /tmp/verify-customer-appointment-cancel-chat-side-v362.mjs

RUN node /tmp/patch-customer-appointment-cancel-chat-side-v362.mjs \
 && node --check /app/customer-appointment-cancellation-v362.js \
 && node --check /app/ui-workflows-v294.js \
 && node --check /app/server.js \
 && node /tmp/verify-customer-appointment-cancel-chat-side-v362.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
