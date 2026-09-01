ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:048b95b78586a2350a18c3c6d0cf0e13ce4f2f0a58a16ca472d0be55c6536b6c
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY audit-business-hours-v514.mjs patch-runtime.mjs verify-runtime.mjs /tmp/lien-v514/
RUN node --check /tmp/lien-v514/audit-business-hours-v514.mjs \
 && node --check /tmp/lien-v514/patch-runtime.mjs \
 && node --check /tmp/lien-v514/verify-runtime.mjs \
 && cp /tmp/lien-v514/audit-business-hours-v514.mjs /app/audit-business-hours-v514.mjs \
 && node /tmp/lien-v514/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/tenant-setup.js \
 && node --check /app/tenant-setup-client.js \
 && node --check /app/.next/server/app/admin/appointments/page.js \
 && node --check /app/.next/static/chunks/app/admin/appointments/page-shift-line-break-v461.js \
 && node /tmp/lien-v514/verify-runtime.mjs \
 && rm -rf /tmp/lien-v514

USER nextjs
