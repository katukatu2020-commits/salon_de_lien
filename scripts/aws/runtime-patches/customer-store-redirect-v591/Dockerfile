ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:7c0a48a2d52a76ba412c1b31fbb45101e856d37e5d9fa84848d77316cbca1f45
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY patch-runtime.mjs verify-runtime.mjs integration.mjs /tmp/lien-v591/
COPY customer-session-v591.js ./
RUN node /tmp/lien-v591/verify-runtime.mjs snapshot \
 && node /tmp/lien-v591/patch-runtime.mjs \
 && node --check customer-session-v591.js \
 && node /tmp/lien-v591/verify-runtime.mjs
USER nextjs
