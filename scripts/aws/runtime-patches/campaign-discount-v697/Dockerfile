ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v697/
RUN node /tmp/lien-v697/patch-runtime.cjs && node /tmp/lien-v697/verify-runtime.mjs
USER nextjs
