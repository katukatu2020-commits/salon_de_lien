ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v695/
RUN node /tmp/lien-v695/patch-runtime.cjs && node /tmp/lien-v695/verify-runtime.mjs
USER nextjs
