ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:shared-account-save-v368
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/shift-first-grab-v369/patch-runtime.mjs /tmp/patch-shift-first-grab-v369.mjs
COPY scripts/aws/runtime-patches/shift-first-grab-v369/verify-runtime.mjs /tmp/verify-shift-first-grab-v369.mjs

RUN node /tmp/patch-shift-first-grab-v369.mjs \
 && node /tmp/verify-shift-first-grab-v369.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
