ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v692/
RUN node /tmp/lien-v692/patch-runtime.cjs && node --check /app/order-consolidation-v692.js && node --check /app/wholesale-ordering-v543.js && node --check /app/dealer-erp-v678.js && node --check /app/public/salon-order-entry-v692.js && node --check /app/public/order-amendments-v692.js && node --check /app/server.js
ENV ORIMIA_ORDER_CONSOLIDATION_RELEASE=v692
USER nextjs
