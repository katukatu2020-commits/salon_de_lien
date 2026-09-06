ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:93caa0b66adc927762568ca6a69c2b1e4627b08cca041c286d6fd5936721fbe3
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v562/

RUN node --check /tmp/lien-v562/patch-runtime.mjs \
 && node --check /tmp/lien-v562/verify-runtime.mjs \
 && node --check /tmp/lien-v562/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v562/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/commercial-admin-v101.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v562/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v562/verify-runtime.mjs \
 && rm -rf /tmp/lien-v562

USER nextjs
