ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:a890015a58d1f992d821e488574ffc06c20e55c013c454a368c2a587ecbd2085
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
