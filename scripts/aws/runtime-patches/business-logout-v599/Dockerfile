ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:df10fb8824a2e64e9ff760eae00571d370ec372896d34c5a2b42e842108c278f
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY patch-runtime.mjs verify-runtime.mjs test-runtime.cjs /tmp/lien-v599/
RUN node /tmp/lien-v599/verify-runtime.mjs snapshot \
 && node /tmp/lien-v599/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/wholesale-ordering-v543.js \
 && node --check /app/.next/server/app/api/auth/logout/route.js \
 && node /tmp/lien-v599/test-runtime.cjs \
 && node /tmp/lien-v599/verify-runtime.mjs \
 && rm -rf /tmp/lien-v599
USER nextjs
