ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v633/
COPY customer-registration-name-v633.js /app/customer-registration-name-v633.js
COPY ensure-customer-name-fields-v633.cjs /app/ensure-customer-name-fields-v633.cjs

RUN cp /usr/local/bin/lien-entrypoint /usr/local/bin/lien-entrypoint-v632 \
 && cp /tmp/lien-v633/lien-entrypoint-v633 /usr/local/bin/lien-entrypoint \
 && chmod 0755 /usr/local/bin/lien-entrypoint /usr/local/bin/lien-entrypoint-v632 \
 && node --check /app/customer-registration-name-v633.js \
 && node --check /app/ensure-customer-name-fields-v633.cjs \
 && node --check /tmp/lien-v633/patch-runtime.mjs \
 && node --check /tmp/lien-v633/verify-runtime.mjs \
 && node --check /tmp/lien-v633/unit-test.mjs \
 && node --check /tmp/lien-v633/browser-regression.mjs \
 && node --check /tmp/lien-v633/production-smoke.mjs \
 && node /tmp/lien-v633/unit-test.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v633/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/.next/server/app/u/register/[token]/page.js \
 && node --check /app/.next/server/chunks/2241.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v633/verify-runtime.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
