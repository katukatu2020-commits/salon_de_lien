ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ba14cd231542ed3e7fa741a846f793d1f0c302de93953f1d0c3d2175611a7884
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v474/
RUN node --check /tmp/lien-v474/patch-runtime.mjs \
 && node --check /tmp/lien-v474/verify-runtime.mjs \
 && node --check /tmp/lien-v474/test-runtime.mjs \
 && node /tmp/lien-v474/patch-runtime.mjs \
 && node /tmp/lien-v474/verify-runtime.mjs \
 && node /tmp/lien-v474/test-runtime.mjs \
 && rm -rf /tmp/lien-v474

USER nextjs
