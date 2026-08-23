ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ac3935b82ecdee3e1be7e342e78c162bab41f0f44de6f6abf24ab132684b172f
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs /tmp/patch-customer-store-navigation-session-v414.mjs
COPY verify-runtime.mjs /tmp/verify-customer-store-navigation-session-v414.mjs

RUN node /tmp/patch-customer-store-navigation-session-v414.mjs \
 && node /tmp/verify-customer-store-navigation-session-v414.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
