ARG BASE_IMAGE=salon-de-lien:branch-shared-contact-v677-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v678/
RUN node /tmp/lien-v678/patch-runtime.mjs \
 && node /tmp/lien-v678/verify-runtime.mjs
USER nextjs
