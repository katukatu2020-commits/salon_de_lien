ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:b09fa7cae06ea82834e03394295ae2bbe10eb29ee45e7706553b6a9ff81cca95
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-profile-image-service-v424.js /app/customer-profile-image-service-v424.js
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v424/
RUN node /tmp/lien-v424/patch-runtime.mjs \
 && node /tmp/lien-v424/verify-runtime.mjs \
 && rm -rf /tmp/lien-v424

USER nextjs
