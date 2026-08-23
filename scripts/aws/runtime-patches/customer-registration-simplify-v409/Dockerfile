FROM 009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:8513ede749ee5a1f9e0777695dd3751a504bfa135a6b5528a7a35ccf50e657f9

USER root
COPY patch-runtime.mjs verify-runtime.mjs /tmp/
RUN node /tmp/patch-runtime.mjs \
  && node /tmp/verify-runtime.mjs
USER nextjs
