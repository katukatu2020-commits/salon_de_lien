ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:4b7bc1728ed63d6c9f2129d047a004fd7e31765fefb556e8d0f58b78f55dc5d8
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY orimia-brand-v501.js store-app-stability-v501.js /app/public/
COPY patch-runtime.mjs verify-runtime.mjs /tmp/store-app-stability-v501/
RUN node --check /tmp/store-app-stability-v501/patch-runtime.mjs \
 && node --check /tmp/store-app-stability-v501/verify-runtime.mjs \
 && node --check /app/public/orimia-brand-v501.js \
 && node --check /app/public/store-app-stability-v501.js \
 && node /tmp/store-app-stability-v501/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && node /tmp/store-app-stability-v501/verify-runtime.mjs \
 && rm -rf /tmp/store-app-stability-v501

USER nextjs
