ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:sales-ledger-scroll-print-v398
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/shift-capacity-weekday-v399/patch-runtime.mjs /tmp/patch-shift-capacity-weekday-v399.mjs
COPY scripts/aws/runtime-patches/shift-capacity-weekday-v399/verify-runtime.mjs /tmp/verify-shift-capacity-weekday-v399.mjs

RUN node /tmp/patch-shift-capacity-weekday-v399.mjs \
 && node /tmp/verify-shift-capacity-weekday-v399.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
