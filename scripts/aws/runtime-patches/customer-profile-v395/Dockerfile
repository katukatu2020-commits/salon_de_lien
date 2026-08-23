ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:shift-staff-drop-v394
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/customer-profile-v395/customer-experience-v395.js /app/customer-experience-v395.js
COPY scripts/aws/runtime-patches/customer-profile-v395/patch-runtime.mjs /tmp/patch-customer-profile-v395.mjs
COPY scripts/aws/runtime-patches/customer-profile-v395/verify-runtime.mjs /tmp/verify-customer-profile-v395.mjs

RUN node /tmp/patch-customer-profile-v395.mjs \
 && node /tmp/verify-customer-profile-v395.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
