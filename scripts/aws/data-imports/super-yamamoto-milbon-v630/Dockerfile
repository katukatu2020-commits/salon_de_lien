ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
COPY catalog-common.mjs import-catalog.mjs audit-catalog.mjs catalog.json /tmp/lien-v630/
RUN chown -R nextjs:nodejs /tmp/lien-v630
USER nextjs
