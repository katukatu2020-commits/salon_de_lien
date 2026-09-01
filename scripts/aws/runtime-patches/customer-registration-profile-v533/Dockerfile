ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:8991c4cf2f6116cbeb2d264f2fdffb708b0add82ab6eecaa1b1c33402bbd960d
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY customer-registration-profile-v533.js /app/customer-registration-profile-v533.js
COPY patch-runtime.mjs verify-runtime.mjs service-smoke.mjs /tmp/lien-v533/

RUN node --check /app/customer-registration-profile-v533.js \
 && node --check /tmp/lien-v533/patch-runtime.mjs \
 && node --check /tmp/lien-v533/verify-runtime.mjs \
 && node --check /tmp/lien-v533/service-smoke.mjs \
 && node /tmp/lien-v533/patch-runtime.mjs \
 && node --check /app/.next/server/chunks/2241.js \
 && node --check /app/.next/server/app/u/register/[token]/page.js \
 && node --check /app/.next/server/app/api/customer-auth/phone-verification/request/route.js \
 && node --check /app/.next/server/app/api/customer-auth/phone-verification/verify/route.js \
 && node --check /app/server.js \
 && node /tmp/lien-v533/verify-runtime.mjs \
 && node /tmp/lien-v533/service-smoke.mjs \
 && rm -rf /tmp/lien-v533

USER nextjs
