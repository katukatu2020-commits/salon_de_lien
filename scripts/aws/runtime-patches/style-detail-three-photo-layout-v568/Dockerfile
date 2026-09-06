ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:5b3a091bee1e97180d23319e8d7f1ef94f298c8944015738debd6f71496fb16c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY style-detail-three-photo-layout-client-v568.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v568/

RUN node --check /tmp/lien-v568/style-detail-three-photo-layout-client-v568.js \
 && node --check /tmp/lien-v568/patch-runtime.mjs \
 && node --check /tmp/lien-v568/verify-runtime.mjs \
 && node --check /tmp/lien-v568/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v568/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v568/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v568/verify-runtime.mjs \
 && rm -rf /tmp/lien-v568

USER nextjs
