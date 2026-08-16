ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:a5494cfc7b80e8c9350082d396f1157e149696f2b155cd120b698ddd1d7779bc
FROM ${BASE_IMAGE}

USER root

COPY scripts/aws/runtime-patches/admin-service-brand/patch-runtime.mjs /tmp/admin-service-brand-patch.mjs
COPY scripts/aws/runtime-patches/admin-service-brand/verify-runtime.cjs /tmp/admin-service-brand-verify.cjs
COPY scripts/aws/runtime-patches/admin-service-brand/salon-customer-service-mark.svg /app/public/brand/salon-customer-service-mark.svg

RUN node /tmp/admin-service-brand-patch.mjs \
  && node /tmp/admin-service-brand-verify.cjs

USER nextjs
