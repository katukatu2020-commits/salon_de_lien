ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v693/
RUN node /tmp/lien-v693/patch-runtime.cjs && node /tmp/lien-v693/verify-runtime.mjs
USER nextjs
