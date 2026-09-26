ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/three-app-qa-v680/
RUN node /tmp/three-app-qa-v680/patch-runtime.mjs
USER nextjs
