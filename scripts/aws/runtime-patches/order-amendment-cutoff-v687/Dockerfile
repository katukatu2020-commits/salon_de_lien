ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v687/
RUN node /tmp/lien-v687/patch-runtime.mjs
USER nextjs
