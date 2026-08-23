ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:2b6c6ad8c23dd16842600d666fa97ce957034cda39beb2f36793c1d498a3d514
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/sales-ledger-ui-parity-v406/sales-ledger-ui-parity-v406.css /tmp/sales-ledger-ui-parity-v406.css
COPY scripts/aws/runtime-patches/sales-ledger-ui-parity-v406/patch-runtime.mjs /tmp/patch-sales-ledger-ui-parity-v406.mjs
COPY scripts/aws/runtime-patches/sales-ledger-ui-parity-v406/verify-runtime.mjs /tmp/verify-sales-ledger-ui-parity-v406.mjs

RUN node /tmp/patch-sales-ledger-ui-parity-v406.mjs \
 && node --check /app/sales-ledger-client-v318.js \
 && node --check /app/tenant-setup-client.js \
 && node /tmp/verify-sales-ledger-ui-parity-v406.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs

