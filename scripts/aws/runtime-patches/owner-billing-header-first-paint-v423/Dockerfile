ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:547fea950214892c065af2a709b6ebf0754a11fb53449e02d27fdfca86aebca4
FROM ${BASE_IMAGE}

USER root
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v423/
RUN node /tmp/lien-v423/patch-runtime.mjs \
    && node /tmp/lien-v423/verify-runtime.mjs \
    && rm -rf /tmp/lien-v423
USER nextjs
