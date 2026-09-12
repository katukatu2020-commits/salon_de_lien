ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v635/
COPY booking-confirmation-name-v635.js /app/booking-confirmation-name-v635.js

RUN node --check /app/booking-confirmation-name-v635.js \
 && node --check /tmp/lien-v635/patch-runtime.mjs \
 && node --check /tmp/lien-v635/verify-runtime.mjs \
 && node --check /tmp/lien-v635/unit-test.mjs \
 && node --check /tmp/lien-v635/browser-regression.mjs \
 && node --check /tmp/lien-v635/production-audit.cjs \
 && node --check /tmp/lien-v635/production-smoke.mjs \
 && node /tmp/lien-v635/unit-test.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v635/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/.next/server/app/admin/appointments/page.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v635/verify-runtime.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
