ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c2ee49f4c1ad4967e59a06e15d1b31592274dec5d6d7c9fdc9c6253baab58cbb
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/store-public-code-v403/patch-runtime.mjs /tmp/patch-store-public-code-v403.mjs
COPY scripts/aws/runtime-patches/store-public-code-v403/verify-runtime.mjs /tmp/verify-store-public-code-v403.mjs

RUN node /tmp/patch-store-public-code-v403.mjs \
 && node /tmp/verify-store-public-code-v403.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
