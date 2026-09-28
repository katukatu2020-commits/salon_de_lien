ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v688/
RUN node /tmp/lien-v688/patch-runtime.mjs && node /tmp/lien-v688/verify-runtime.mjs
USER nextjs
