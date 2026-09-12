ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v634/
COPY style-post-order-v634.js /app/style-post-order-v634.js
COPY ensure-style-demo-ordering-v634.cjs /app/ensure-style-demo-ordering-v634.cjs

RUN cp /usr/local/bin/lien-entrypoint /usr/local/bin/lien-entrypoint-v633 \
 && cp /tmp/lien-v634/lien-entrypoint-v634 /usr/local/bin/lien-entrypoint \
 && chmod 0755 /usr/local/bin/lien-entrypoint /usr/local/bin/lien-entrypoint-v633 \
 && node --check /app/style-post-order-v634.js \
 && node --check /app/ensure-style-demo-ordering-v634.cjs \
 && node --check /tmp/lien-v634/patch-runtime.mjs \
 && node --check /tmp/lien-v634/verify-runtime.mjs \
 && node --check /tmp/lien-v634/unit-test.mjs \
 && node --check /tmp/lien-v634/integration-test.cjs \
 && node --check /tmp/lien-v634/browser-regression.mjs \
 && node --check /tmp/lien-v634/production-smoke.mjs \
 && node /tmp/lien-v634/unit-test.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v634/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/style-admin-controls-v618.js \
 && node --check /app/public/style-admin-controls-v618.js \
 && node --check /app/style-community-controls-v610.js \
 && node --check /app/public/style-community-controls-v610.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v634/verify-runtime.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
