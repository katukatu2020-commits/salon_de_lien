ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:34b2d4b19d130af3b77f6691879caf6f2de87a4511356a9a75ef57a74384699c
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY admin-chat-inbox-v589.js admin-chat-icons-v589.js admin-chat-search-client-v589.js admin-chat-search-v589.css ./
COPY patch-runtime.mjs /tmp/lien-v589/patch-runtime.mjs
RUN node --check admin-chat-inbox-v589.js \
 && node --check admin-chat-search-client-v589.js \
 && node /tmp/lien-v589/patch-runtime.mjs \
 && node --check .next/server/app/admin/customers/messages/page.js \
 && node --check server.js \
 && rm /tmp/lien-v589/patch-runtime.mjs
USER nextjs
