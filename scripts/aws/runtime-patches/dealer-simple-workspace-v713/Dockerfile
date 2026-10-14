ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c2c8408ae3732c71ecda3a15615f6159a255be47d488aa7c2684ee168b6222f6
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v713
RUN node /tmp/lien-v713/patch-runtime.cjs && node /tmp/lien-v713/verify-runtime.mjs
USER nextjs
