FROM 009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:0ed63e3161c6cdafe979e3c6b10def94b01330a0f716d712b1f5f3f327651d43

COPY patch-runtime.mjs verify-runtime.mjs /tmp/
RUN node /tmp/patch-runtime.mjs \
  && node /tmp/verify-runtime.mjs
