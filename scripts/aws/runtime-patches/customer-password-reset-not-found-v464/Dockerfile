ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:4eaff16b31a6cafccb3842bbad4ebc8a0e98562a2687d9e3726c91d24de9fa96
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs smoke-production.mjs test-runtime.mjs /tmp/lien-v464/
RUN node --check /tmp/lien-v464/patch-runtime.mjs \
 && node --check /tmp/lien-v464/verify-runtime.mjs \
 && node --check /tmp/lien-v464/smoke-production.mjs \
 && node --check /tmp/lien-v464/test-runtime.mjs \
 && node /tmp/lien-v464/patch-runtime.mjs \
 && node /tmp/lien-v464/verify-runtime.mjs \
 && node /tmp/lien-v464/test-runtime.mjs \
 && rm -rf /tmp/lien-v464

USER nextjs
