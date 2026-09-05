ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:07f87a2a9bb472c589df12081d6363cb0fb382a6963fd0a35ce49a971549fb62
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-profile-auto-upload-v545.js patch-runtime.mjs verify-runtime.mjs /tmp/lien-v545/

RUN node --check /tmp/lien-v545/customer-profile-auto-upload-v545.js \
 && node --check /tmp/lien-v545/patch-runtime.mjs \
 && node --check /tmp/lien-v545/verify-runtime.mjs \
 && node /tmp/lien-v545/patch-runtime.mjs \
 && node --check /app/customer-experience-v503.js \
 && node --check /app/customer-link-ui-v424.js \
 && node --check /app/customer-link-ui-v293.js \
 && node --check /app/customer-runtime-v267.js \
 && node --check /app/public/customer-profile-image-v401.js \
 && node --check '/app/.next/static/chunks/app/u/(account)/profile/page-profile-code-v267.auto-upload-v545.js' \
 && node --check /app/server.js \
 && node /tmp/lien-v545/verify-runtime.mjs \
 && rm -rf /tmp/lien-v545

USER nextjs
