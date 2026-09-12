ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v636/
COPY customer-profile-name-v636.js /app/customer-profile-name-v636.js

RUN node --check /app/customer-profile-name-v636.js \
 && node --check /tmp/lien-v636/patch-runtime.mjs \
 && node --check /tmp/lien-v636/verify-runtime.mjs \
 && node --check /tmp/lien-v636/unit-test.mjs \
 && node --check /tmp/lien-v636/browser-regression.mjs \
 && node --check /tmp/lien-v636/production-audit.cjs \
 && node --check /tmp/lien-v636/production-smoke.mjs \
 && node /tmp/lien-v636/unit-test.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v636/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check '/app/.next/server/app/u/(account)/profile/page.js' \
 && node --check /app/.next/server/app/api/customer/profile/route.js \
 && node --check /app/customer-experience-v503.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v636/verify-runtime.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
