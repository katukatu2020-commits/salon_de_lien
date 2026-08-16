ARG BASE_IMAGE
FROM ${BASE_IMAGE}

COPY scripts/aws/runtime-patches/showcase-gmail-staff/patch-runtime.mjs /tmp/showcase-gmail-staff-patch.mjs
COPY scripts/aws/runtime-patches/showcase-gmail-staff/patch-shift-runtime.mjs /tmp/showcase-gmail-shift-patch.mjs
COPY scripts/aws/runtime-patches/showcase-gmail-staff/verify-runtime.cjs /tmp/showcase-gmail-staff-verify.cjs
COPY public/demo/showcase/styles /app/public/demo/showcase/styles
RUN node /tmp/showcase-gmail-staff-patch.mjs \
  && node /tmp/showcase-gmail-shift-patch.mjs \
  && node /tmp/showcase-gmail-staff-verify.cjs
