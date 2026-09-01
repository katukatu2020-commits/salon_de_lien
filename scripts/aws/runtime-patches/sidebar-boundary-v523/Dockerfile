ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:f1fad78f8b08efeedcc52b9eb411f274eca5e432d9e090f7d714ecc9cc66f060
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY sidebar-boundary-v523.css patch-runtime.mjs verify-runtime.mjs /tmp/lien-v523/

RUN node --check /tmp/lien-v523/patch-runtime.mjs \
 && node --check /tmp/lien-v523/verify-runtime.mjs \
 && node /tmp/lien-v523/patch-runtime.mjs \
 && node --check /app/server.js \
 && node /tmp/lien-v523/verify-runtime.mjs \
 && rm -rf /tmp/lien-v523

USER nextjs
