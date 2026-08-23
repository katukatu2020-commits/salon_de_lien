FROM 009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:255a37058570b7d8aba707add6a8f0c94e2a26495b35719226bb58234660e825

USER root
COPY patch-runtime.mjs verify-runtime.mjs /tmp/
RUN node /tmp/patch-runtime.mjs \
  && node /tmp/verify-runtime.mjs
USER nextjs
