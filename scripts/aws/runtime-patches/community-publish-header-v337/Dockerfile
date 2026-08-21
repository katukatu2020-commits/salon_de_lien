ARG BASE_IMAGE=salon-de-lien:shift-drag-cache-v335
FROM ${BASE_IMAGE}

COPY community-publish-header-v337/community-publishing-v337.js /app/community-publishing-v337.js
COPY community-publish-header-v337/community-publishing-client-v337.js /app/community-publishing-client-v337.js
COPY community-publish-header-v337/patch-runtime.mjs /tmp/community-publish-header-v337.mjs
COPY community-publish-header-v337/verify-runtime.mjs /tmp/verify-community-publish-header-v337.mjs

RUN node /tmp/community-publish-header-v337.mjs \
 && node /tmp/verify-community-publish-header-v337.mjs \
 && node --check /app/server.js \
 && node --check /app/community-publishing-v337.js \
 && node --check /app/community-publishing-client-v337.js
