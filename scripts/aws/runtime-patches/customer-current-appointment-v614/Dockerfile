ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY . /tmp/lien-v614/
RUN node /tmp/lien-v614/verify-runtime.mjs snapshot \
 && node /tmp/lien-v614/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check '/app/.next/server/app/u/(account)/appointments/page.js' \
 && node --check '/app/.next/server/app/u/(account)/home/page.js' \
 && node --check '/app/.next/server/app/admin/appointments/[appointmentId]/page.js' \
 && node --check /app/.next/server/chunks/1608.js \
 && node --check /app/.next/server/chunks/2241.js \
 && node --check /app/customer-summary-v614.js \
 && node /tmp/lien-v614/verify-runtime.mjs
USER nextjs
