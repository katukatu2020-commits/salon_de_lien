ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:42217e54bdb040be2c9ef22aa631240bfa84146f9bd4d4a6727db0b348161a4a
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs /tmp/patch-full-surface-quality-v420.mjs
COPY verify-runtime.mjs /tmp/verify-full-surface-quality-v420.mjs

RUN node /tmp/patch-full-surface-quality-v420.mjs \
 && node /tmp/verify-full-surface-quality-v420.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
