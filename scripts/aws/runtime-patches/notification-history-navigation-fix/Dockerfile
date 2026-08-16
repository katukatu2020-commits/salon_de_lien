ARG BASE_IMAGE
FROM ${BASE_IMAGE}

COPY scripts/aws/runtime-patches/notification-history-navigation-fix/patch-runtime.mjs /tmp/notification-history-navigation-fix.mjs
COPY scripts/aws/runtime-patches/notification-history-navigation-fix/verify-runtime.cjs /tmp/notification-history-navigation-verify.cjs
RUN node /tmp/notification-history-navigation-fix.mjs \
  && node /tmp/notification-history-navigation-verify.cjs
