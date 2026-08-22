ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-cancellation-resilience-v380
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/admin-image-crop-v381/patch-runtime.mjs /tmp/patch-admin-image-crop-v381.mjs
COPY scripts/aws/runtime-patches/admin-image-crop-v381/verify-runtime.mjs /tmp/verify-admin-image-crop-v381.mjs

RUN node /tmp/patch-admin-image-crop-v381.mjs \
 && node /tmp/verify-admin-image-crop-v381.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
