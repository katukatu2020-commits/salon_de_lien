ARG BASE_IMAGE=009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:9e01bfb48b6b2b8aeab4b7f012f282e8685bbf1812a43c5c7da4cfb18f26e6a0
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY patch-runtime.mjs /tmp/patch-shift-tenant-staff-lane-v415.mjs
COPY verify-runtime.mjs /tmp/verify-shift-tenant-staff-lane-v415.mjs

RUN node /tmp/patch-shift-tenant-staff-lane-v415.mjs \
 && node /tmp/verify-shift-tenant-staff-lane-v415.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
