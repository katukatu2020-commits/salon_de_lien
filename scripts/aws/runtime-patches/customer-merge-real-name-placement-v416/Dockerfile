ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:51884dfb47f7a8b9adaacb1f0350e890d8a577fb17047c5c00e0ade8681d7170
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs /tmp/patch-customer-merge-real-name-placement-v416.mjs
COPY verify-runtime.mjs /tmp/verify-customer-merge-real-name-placement-v416.mjs

RUN node /tmp/patch-customer-merge-real-name-placement-v416.mjs \
 && node /tmp/verify-customer-merge-real-name-placement-v416.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
