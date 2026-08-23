ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c6cbd2c3461a5851e4abd2c8a3ff096d9d2a2d06a173cfc340c9e4f75e8e5fb2
FROM ${BASE_IMAGE}

USER root
COPY customer-experience-v395.js /app/customer-experience-v395.js
COPY verify-runtime.mjs /tmp/verify-customer-mobile-bottom-nav-v411.mjs
RUN node --check /app/customer-experience-v395.js \
  && node /tmp/verify-customer-mobile-bottom-nav-v411.mjs
USER nextjs
