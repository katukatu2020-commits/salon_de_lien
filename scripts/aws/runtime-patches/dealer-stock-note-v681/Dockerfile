ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v681/
RUN node /tmp/lien-v681/patch-runtime.mjs
USER nextjs
