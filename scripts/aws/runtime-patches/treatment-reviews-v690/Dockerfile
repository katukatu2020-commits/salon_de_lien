ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v690/
RUN node /tmp/lien-v690/patch-runtime.mjs && node /tmp/lien-v690/verify-runtime.mjs
USER nextjs
