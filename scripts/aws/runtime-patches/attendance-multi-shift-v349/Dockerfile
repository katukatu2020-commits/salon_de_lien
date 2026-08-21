ARG BASE_IMAGE=salon-de-lien:community-standalone-v348
FROM ${BASE_IMAGE}

USER root

COPY scripts/aws/runtime-patches/attendance-multi-shift-v349/attendance-multi-shift-v349.js /app/attendance-multi-shift-v349.js
COPY scripts/aws/runtime-patches/attendance-multi-shift-v349/attendance-client-v349.js /app/attendance-client-v349.js
COPY scripts/aws/runtime-patches/attendance-multi-shift-v349/patch-runtime.mjs /tmp/patch-attendance-multi-shift-v349.mjs
COPY scripts/aws/runtime-patches/attendance-multi-shift-v349/verify-runtime.mjs /tmp/verify-attendance-multi-shift-v349.mjs
COPY scripts/aws/runtime-patches/attendance-multi-shift-v349/smoke-test.sql /tmp/attendance-multi-shift-v349-smoke-test.sql

RUN node /tmp/patch-attendance-multi-shift-v349.mjs \
 && node --check /app/server.js \
 && node --check /app/attendance-multi-shift-v349.js \
 && node --check /app/attendance-client-v349.js \
 && node /tmp/verify-attendance-multi-shift-v349.mjs

USER nextjs
