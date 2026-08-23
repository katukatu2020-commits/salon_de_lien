ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:cbb0fa3c9a17400d9a43c4d47e8cd2769fd6da4ee56b694660f04b4e7f599eba
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs /tmp/patch-commercial-transactional-email-v419.mjs
COPY verify-runtime.mjs /tmp/verify-commercial-transactional-email-v419.mjs

RUN node /tmp/patch-commercial-transactional-email-v419.mjs \
 && node /tmp/verify-commercial-transactional-email-v419.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
