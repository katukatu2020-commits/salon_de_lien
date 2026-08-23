ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-profile-v395b
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/store-icon-tenant-isolation-v397/patch-runtime.mjs /tmp/patch-store-icon-tenant-isolation-v397.mjs
COPY scripts/aws/runtime-patches/store-icon-tenant-isolation-v397/verify-runtime.mjs /tmp/verify-store-icon-tenant-isolation-v397.mjs

RUN node /tmp/patch-store-icon-tenant-isolation-v397.mjs \
 && node /tmp/verify-store-icon-tenant-isolation-v397.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
