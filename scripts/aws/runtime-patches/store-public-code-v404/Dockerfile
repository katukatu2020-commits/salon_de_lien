ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:af0fe8a612741aa5495bd8eecfcdc396c7ac12ab9633061306840c84015f836c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/store-public-code-v404/patch-runtime.mjs /tmp/patch-store-public-code-v404.mjs
COPY scripts/aws/runtime-patches/store-public-code-v404/verify-runtime.mjs /tmp/verify-store-public-code-v404.mjs

RUN node /tmp/patch-store-public-code-v404.mjs \
 && node --check /app/billing.js \
 && node /tmp/verify-store-public-code-v404.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
