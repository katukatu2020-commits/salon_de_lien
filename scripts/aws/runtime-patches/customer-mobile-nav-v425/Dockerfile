ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:2064f62ccdc0abce453d8d44ee733a27a1a2e9dd112796e2c1c350582214356b
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-mobile-nav-v425.css /app/public/customer-mobile-nav-v425.css
COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v425/
RUN node /tmp/lien-v425/patch-runtime.mjs \
 && node /tmp/lien-v425/verify-runtime.mjs \
 && rm -rf /tmp/lien-v425

USER nextjs
