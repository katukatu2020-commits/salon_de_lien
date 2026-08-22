ARG BASE_IMAGE=salon-de-lien:platform-customer-login-id-v355
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

RUN cp /usr/local/bin/lien-entrypoint /usr/local/bin/lien-entrypoint-v355

COPY scripts/aws/runtime-patches/platform-customer-account-delete-v356/patch-runtime.mjs /tmp/patch-platform-customer-account-delete-v356.mjs
COPY scripts/aws/runtime-patches/platform-customer-account-delete-v356/verify-runtime.mjs /tmp/verify-platform-customer-account-delete-v356.mjs
COPY scripts/aws/runtime-patches/platform-customer-account-delete-v356/ensure-platform-account-actions.cjs /app/ensure-platform-account-actions.cjs
COPY scripts/aws/runtime-patches/platform-customer-account-delete-v356/lien-entrypoint /usr/local/bin/lien-entrypoint

RUN node /tmp/patch-platform-customer-account-delete-v356.mjs \
 && node --check /app/platform-operator.js \
 && node --check /app/ensure-platform-account-actions.cjs \
 && node /tmp/verify-platform-customer-account-delete-v356.mjs \
 && chmod 0755 /usr/local/bin/lien-entrypoint /usr/local/bin/lien-entrypoint-v355

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
