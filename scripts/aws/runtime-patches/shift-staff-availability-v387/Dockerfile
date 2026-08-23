ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-record-merge-scope-v386
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/shift-staff-availability-v387/patch-runtime.mjs /tmp/patch-shift-staff-availability-v387.mjs
COPY scripts/aws/runtime-patches/shift-staff-availability-v387/verify-runtime.mjs /tmp/verify-shift-staff-availability-v387.mjs

RUN node /tmp/patch-shift-staff-availability-v387.mjs \
 && node /tmp/verify-shift-staff-availability-v387.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
