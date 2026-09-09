ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:a7d3e8083c94a724f021b3c4bec9ec6a4cc639c4361224aacebd249aa5a40eae
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY customer-login-visual-v593.css ./public/
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v593/
RUN node /tmp/lien-v593/verify-runtime.mjs snapshot \
 && node /tmp/lien-v593/patch-runtime.mjs --apply \
 && node --check .next/server/app/u/login/page.js \
 && node --check server.js \
 && node /tmp/lien-v593/verify-runtime.mjs
USER nextjs
