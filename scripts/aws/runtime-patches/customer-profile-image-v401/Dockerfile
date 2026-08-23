ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c3862bee5b29d8e5bf015e617c8511b9907c7b612f996cb329b32a8fe6767286
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-profile-image-v401/customer-profile-image-v401.js /app/public/customer-profile-image-v401.js
COPY scripts/aws/runtime-patches/customer-profile-image-v401/patch-runtime.mjs /tmp/patch-customer-profile-image-v401.mjs
COPY scripts/aws/runtime-patches/customer-profile-image-v401/verify-runtime.mjs /tmp/verify-customer-profile-image-v401.mjs

RUN node /tmp/patch-customer-profile-image-v401.mjs \
 && node /tmp/verify-customer-profile-image-v401.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
