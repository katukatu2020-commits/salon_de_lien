ARG BASE_IMAGE=salon-de-lien:branch-shared-contact-v677-local
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v678/
RUN npm install --prefix /opt/dealer-erp --omit=dev --ignore-scripts --no-audit --no-fund csv-parse@5.6.0 \
 && node /tmp/lien-v678/patch-runtime.mjs \
 && node /tmp/lien-v678/verify-runtime.mjs
USER nextjs
