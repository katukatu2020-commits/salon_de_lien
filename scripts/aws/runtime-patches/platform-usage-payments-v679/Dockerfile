ARG BASE_IMAGE=salon-de-lien:dealer-erp-v678-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v679/
RUN node /tmp/lien-v679/patch-runtime.mjs && node /tmp/lien-v679/verify-runtime.mjs
USER nextjs
