ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:c7d798aa11700e232b7366f0be68d2565d02811091a7c16ef559ad8baa230156
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY customer-notification-badge-v597.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v597/
RUN node /tmp/lien-v597/verify-runtime.mjs snapshot \
 && node /tmp/lien-v597/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/customer-experience-v508.js \
 && node --check /app/customer-experience-v503.js \
 && node /tmp/lien-v597/verify-runtime.mjs \
 && rm -rf /tmp/lien-v597
USER nextjs
