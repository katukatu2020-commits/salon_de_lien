ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:86666c3c87bb8e4161a11a242e04b2ff6db4797a1f2f982bde00e836816dabd2
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs /tmp/patch-customer-campaign-admin-desktop-v418.mjs
COPY verify-runtime.mjs /tmp/verify-customer-campaign-admin-desktop-v418.mjs

RUN node /tmp/patch-customer-campaign-admin-desktop-v418.mjs \
 && node /tmp/verify-customer-campaign-admin-desktop-v418.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
