ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:d878e9077078ff771fbe65a8f37aebcb6dea81c4a5e119009bd990006966122f
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v663/

RUN node --check /tmp/lien-v663/appointment-datetime-editor-v663.js \
 && node --check /tmp/lien-v663/patch-runtime.mjs \
 && node --check /tmp/lien-v663/verify-runtime.mjs \
 && node --check /tmp/lien-v663/browser-regression.mjs \
 && node --check /tmp/lien-v663/production-smoke.mjs \
 && node --check /tmp/lien-v663/integration-browser-regression.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v663/verify-runtime.mjs snapshot \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v663/patch-runtime.mjs \
 && node --check /app/staff-breaks-checkout-menu-client-v442.js \
 && node --check /app/server.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v663/verify-runtime.mjs

USER nextjs
