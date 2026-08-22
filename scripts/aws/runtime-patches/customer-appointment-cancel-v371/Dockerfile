ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-appointment-cancel-v370
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-appointment-cancel-v371/patch-runtime.mjs /tmp/patch-customer-appointment-cancel-v371.mjs
COPY scripts/aws/runtime-patches/customer-appointment-cancel-v371/verify-runtime.mjs /tmp/verify-customer-appointment-cancel-v371.mjs

RUN node /tmp/patch-customer-appointment-cancel-v371.mjs \
 && node --check /app/public/customer-appointment-cancel-v371.js \
 && node /tmp/verify-customer-appointment-cancel-v371.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
