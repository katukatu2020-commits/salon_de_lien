ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-community-mobile-runtime-v377
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-community-mobile-shell-v378/patch-runtime.mjs /tmp/patch-customer-community-mobile-shell-v378.mjs
COPY scripts/aws/runtime-patches/customer-community-mobile-shell-v378/verify-runtime.mjs /tmp/verify-customer-community-mobile-shell-v378.mjs

RUN node /tmp/patch-customer-community-mobile-shell-v378.mjs \
 && node /tmp/verify-customer-community-mobile-shell-v378.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
