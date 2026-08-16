ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:fc7aec2a6862f56b08739e16d8cc13b17cc4c400c16c234867e739edbb778d04
FROM ${BASE_IMAGE}

USER root

COPY scripts/aws/runtime-patches/demo-polish-20260816/patch-runtime.mjs /tmp/demo-polish-patch.mjs
COPY scripts/aws/runtime-patches/demo-polish-20260816/verify-runtime.cjs /tmp/demo-polish-verify.cjs
COPY scripts/aws/runtime-patches/demo-polish-20260816/seed-showcase-expansion.cjs /app/scripts/seed-showcase-expansion.cjs

RUN node /tmp/demo-polish-patch.mjs \
  && node /tmp/demo-polish-verify.cjs

USER nextjs
