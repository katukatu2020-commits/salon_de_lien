ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:ed957d178c4c5a5725db062bd1818d88cee8f45d547257212b1c888df94bd5ae
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY sales-ledger-visual-parity-v413.css /tmp/sales-ledger-visual-parity-v413.css
COPY patch-runtime.mjs /tmp/patch-sales-ledger-visual-parity-v413.mjs
COPY verify-runtime.mjs /tmp/verify-sales-ledger-visual-parity-v413.mjs

RUN node /tmp/patch-sales-ledger-visual-parity-v413.mjs \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/tenant-setup-client.js \
 && node /tmp/verify-sales-ledger-visual-parity-v413.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
