ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:586a872804542e26bb7f5709e31d789db66e78b1b78785b23ac9d3f5f6cd193d
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v714/
RUN node /tmp/lien-v714/patch-runtime.cjs && node /tmp/lien-v714/verify-runtime.mjs
USER nextjs
