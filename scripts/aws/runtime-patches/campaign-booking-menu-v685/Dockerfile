ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v685/
RUN node /tmp/lien-v685/patch-runtime.mjs
USER nextjs
