ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
COPY . /tmp/lien-v694/
RUN mkdir -p /app/flam-export-v694 && cp /tmp/lien-v694/package*.json /app/flam-export-v694/ && cd /app/flam-export-v694 && npm ci --omit=dev --ignore-scripts --no-audit --no-fund && cp /tmp/lien-v694/export.cjs /tmp/lien-v694/headers.json /app/flam-export-v694/ && node /tmp/lien-v694/patch-runtime.cjs && node /tmp/lien-v694/verify-runtime.mjs
USER nextjs
