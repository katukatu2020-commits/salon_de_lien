ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v689/
RUN node /tmp/lien-v689/patch-runtime.mjs && node /tmp/lien-v689/verify-runtime.mjs
USER nextjs
