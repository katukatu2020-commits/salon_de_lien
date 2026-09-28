ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v696/
RUN node /tmp/lien-v696/patch-runtime.cjs && node /tmp/lien-v696/verify-runtime.mjs
USER nextjs
