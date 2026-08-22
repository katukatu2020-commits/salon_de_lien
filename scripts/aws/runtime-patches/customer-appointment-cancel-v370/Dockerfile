ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:shift-first-grab-v369
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-appointment-cancel-v370/customer-appointment-cancel-v370.js /tmp/customer-appointment-cancel-v370.js
COPY scripts/aws/runtime-patches/customer-appointment-cancel-v370/patch-runtime.mjs /tmp/patch-customer-appointment-cancel-v370.mjs
COPY scripts/aws/runtime-patches/customer-appointment-cancel-v370/verify-runtime.mjs /tmp/verify-customer-appointment-cancel-v370.mjs

RUN node /tmp/patch-customer-appointment-cancel-v370.mjs \
 && node --check /app/server.js \
 && node --check /app/public/customer-appointment-cancel-v370.js \
 && node /tmp/verify-customer-appointment-cancel-v370.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
