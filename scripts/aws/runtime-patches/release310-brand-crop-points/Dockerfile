ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root

COPY scripts/aws/runtime-patches/release310-brand-crop-points/patch-runtime.mjs /tmp/release310-patch.mjs
COPY scripts/aws/runtime-patches/release310-brand-crop-points/verify-runtime.cjs /tmp/release310-verify.cjs

RUN node /tmp/release310-patch.mjs \
  && node /tmp/release310-verify.cjs

USER nextjs
