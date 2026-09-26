ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v686/
RUN node /tmp/lien-v686/patch-runtime.mjs
USER nextjs
