ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:20039ca915e9023f9fd3f96c203154f24356917dfd5bb04ac7a1027e9ac35b41
FROM ${BASE_IMAGE}
USER root
WORKDIR /app
COPY audience-sites.js audience-icons.js orimia-public-v588.css ./
COPY patch-runtime.mjs test-runtime.mjs /tmp/lien-v588/
RUN node --check audience-sites.js \
 && node /tmp/lien-v588/patch-runtime.mjs \
 && node --check public-site.js \
 && node --check server.js \
 && node /tmp/lien-v588/test-runtime.mjs \
 && rm -r /tmp/lien-v588
USER nextjs
