ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:8a56702d8bb648c7e454016c2ad6801026ced4829c73bdd0071bc1cb8d0fd489
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/first-store-product-tour-v405/product-tour-v405.js /tmp/product-tour-v405.js
COPY scripts/aws/runtime-patches/first-store-product-tour-v405/patch-runtime.mjs /tmp/patch-first-store-product-tour-v405.mjs
COPY scripts/aws/runtime-patches/first-store-product-tour-v405/verify-runtime.mjs /tmp/verify-first-store-product-tour-v405.mjs

RUN node --check /tmp/product-tour-v405.js \
 && node /tmp/patch-first-store-product-tour-v405.mjs \
 && node --check /app/tenant-setup-client.js \
 && node /tmp/verify-first-store-product-tour-v405.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
