ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:e79a656ec53cee50609990463bd458a8df8e25dc744cbba9fefe7da04850441e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY admin-workspace-layout-v572.js patch-runtime.mjs verify-runtime.mjs test-runtime.mjs /tmp/lien-v586/

RUN node --check /tmp/lien-v586/admin-workspace-layout-v572.js \
 && node --check /tmp/lien-v586/patch-runtime.mjs \
 && node --check /tmp/lien-v586/verify-runtime.mjs \
 && node --check /tmp/lien-v586/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v586/test-runtime.mjs \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v586/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public/admin-workspace-layout-v572.js \
 && LIEN_RUNTIME_ROOT=/app node /tmp/lien-v586/verify-runtime.mjs \
 && rm -rf /tmp/lien-v586

USER nextjs
