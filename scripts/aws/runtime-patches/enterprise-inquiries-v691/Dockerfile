ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v691/
RUN node /tmp/lien-v691/patch-runtime.mjs && node /tmp/lien-v691/verify-runtime.mjs
USER nextjs
