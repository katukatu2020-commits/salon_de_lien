ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:5ddacf417fa80de9a56ae8cb17e3f34f14f214667c8892dcaadcd5d94a03cc0e
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs verify-runtime.mjs /tmp/lien-v453/
RUN node --check /tmp/lien-v453/patch-runtime.mjs \
 && node --check /tmp/lien-v453/verify-runtime.mjs \
 && node /tmp/lien-v453/patch-runtime.mjs \
 && node /tmp/lien-v453/verify-runtime.mjs \
 && rm -rf /tmp/lien-v453

USER nextjs
