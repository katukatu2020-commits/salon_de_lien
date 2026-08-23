ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-chat-state-navigation-v393
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY scripts/aws/runtime-patches/shift-staff-drop-v394/patch-runtime.mjs /tmp/patch-shift-staff-drop-v394.mjs
COPY scripts/aws/runtime-patches/shift-staff-drop-v394/verify-runtime.mjs /tmp/verify-shift-staff-drop-v394.mjs

RUN node /tmp/patch-shift-staff-drop-v394.mjs \
 && node /tmp/verify-shift-staff-drop-v394.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
