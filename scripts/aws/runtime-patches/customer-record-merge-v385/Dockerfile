ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:staff-days-off-identity-v384
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-record-merge-v385/customer-merge-v385.js /app/customer-merge-v385.js
COPY scripts/aws/runtime-patches/customer-record-merge-v385/customer-merge-client-v385.js /app/customer-merge-client-v385.js
COPY scripts/aws/runtime-patches/customer-record-merge-v385/patch-runtime.mjs /tmp/patch-customer-record-merge-v385.mjs
COPY scripts/aws/runtime-patches/customer-record-merge-v385/verify-runtime.mjs /tmp/verify-customer-record-merge-v385.mjs

RUN node /tmp/patch-customer-record-merge-v385.mjs \
 && node /tmp/verify-customer-record-merge-v385.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
