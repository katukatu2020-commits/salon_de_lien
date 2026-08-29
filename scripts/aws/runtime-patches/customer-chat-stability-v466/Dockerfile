ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ff8ee225122a460bcf94a6b82c429f246d80c333499dc31a9670f2e5f9de77e2
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY content-edit-delete-client-v466.js /app/
COPY patch-runtime.mjs verify-runtime.mjs smoke-production.mjs /tmp/lien-v466/
RUN node --check /app/content-edit-delete-client-v466.js \
 && node --check /tmp/lien-v466/patch-runtime.mjs \
 && node --check /tmp/lien-v466/verify-runtime.mjs \
 && node --check /tmp/lien-v466/smoke-production.mjs \
 && node /tmp/lien-v466/patch-runtime.mjs \
 && node /tmp/lien-v466/verify-runtime.mjs \
 && rm -rf /tmp/lien-v466

USER nextjs
