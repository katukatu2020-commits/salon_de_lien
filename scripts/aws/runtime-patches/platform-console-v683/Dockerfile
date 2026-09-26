ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v683/
RUN node /tmp/lien-v683/patch-runtime.mjs
USER nextjs
