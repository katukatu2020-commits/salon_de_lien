ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:0b8770fb0e6348a09f7b3669a1e5146133386ccdbae41b38ad139fedd656dd80
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs /tmp/patch-settings-modal-commercial-v417.mjs
COPY verify-runtime.mjs /tmp/verify-settings-modal-commercial-v417.mjs

RUN node /tmp/patch-settings-modal-commercial-v417.mjs \
 && node /tmp/verify-settings-modal-commercial-v417.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
