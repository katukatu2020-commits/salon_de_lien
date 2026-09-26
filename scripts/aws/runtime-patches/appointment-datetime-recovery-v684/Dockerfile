ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v684/
RUN node /tmp/lien-v684/patch-runtime.mjs
USER nextjs
