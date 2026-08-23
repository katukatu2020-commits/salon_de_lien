FROM 009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:aff85514fc996751423c01642bac92a17f28ff7a2f3f37339be699f8c4a65ce9

USER root
COPY patch-runtime.mjs verify-runtime.mjs /tmp/
RUN node /tmp/patch-runtime.mjs \
  && node /tmp/verify-runtime.mjs
USER nextjs
