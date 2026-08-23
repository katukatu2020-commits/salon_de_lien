ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-record-merge-v385
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-record-merge-scope-v386/patch-runtime.mjs /tmp/patch-customer-record-merge-scope-v386.mjs
COPY scripts/aws/runtime-patches/customer-record-merge-scope-v386/verify-runtime.mjs /tmp/verify-customer-record-merge-scope-v386.mjs

RUN node /tmp/patch-customer-record-merge-scope-v386.mjs \
 && node /tmp/verify-customer-record-merge-scope-v386.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs

