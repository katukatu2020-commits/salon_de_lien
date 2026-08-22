ARG BASE_IMAGE=salon-de-lien:customer-card-store-profile-v352
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/store-customer-visibility-v353/patch-runtime.mjs /tmp/patch-store-customer-visibility-v353.mjs
COPY scripts/aws/runtime-patches/store-customer-visibility-v353/verify-runtime.mjs /tmp/verify-store-customer-visibility-v353.mjs
COPY scripts/aws/runtime-patches/store-customer-visibility-v353/ensure-store-customer-visibility.cjs /app/ensure-store-customer-visibility.cjs
COPY scripts/aws/runtime-patches/store-customer-visibility-v353/lien-entrypoint /usr/local/bin/lien-entrypoint

RUN node /tmp/patch-store-customer-visibility-v353.mjs \
 && npx prisma generate \
 && node /tmp/verify-store-customer-visibility-v353.mjs \
 && chmod 0755 /usr/local/bin/lien-entrypoint

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
