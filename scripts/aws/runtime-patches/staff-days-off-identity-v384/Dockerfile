ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:community-image-aspect-v383
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/staff-days-off-identity-v384/patch-runtime.mjs /tmp/patch-staff-days-off-identity-v384.mjs
COPY scripts/aws/runtime-patches/staff-days-off-identity-v384/verify-runtime.mjs /tmp/verify-staff-days-off-identity-v384.mjs

RUN node /tmp/patch-staff-days-off-identity-v384.mjs \
 && node /tmp/verify-staff-days-off-identity-v384.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs

