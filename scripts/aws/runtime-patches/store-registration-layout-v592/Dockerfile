ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:05e509949d5fdb06ebe8269a497c25826117980d52bcb5b2f8569f39689ca17e
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY store-registration-v592.js ./
COPY store-registration-v592.css ./public/
COPY patch-runtime.mjs verify-runtime.mjs service-tests.mjs /tmp/lien-v592/
RUN node /tmp/lien-v592/verify-runtime.mjs snapshot \
 && node /tmp/lien-v592/patch-runtime.mjs \
 && node --check billing.js \
 && node --check server.js \
 && node --check store-registration-v592.js \
 && node /tmp/lien-v592/verify-runtime.mjs \
 && node /tmp/lien-v592/service-tests.mjs
USER nextjs
