ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root
WORKDIR /app

COPY . /tmp/lien-v637/
COPY business-inquiries-v637.js /app/business-inquiries-v637.js

RUN cp /app/orimia-public-v588.css /app/orimia-public-v637.css \
 && node --check /app/business-inquiries-v637.js \
 && node --check /tmp/lien-v637/patch-runtime.mjs \
 && node /tmp/lien-v637/patch-runtime.mjs \
 && node --check /app/server.js \
 && node --check /app/public-site.js \
 && node --check /app/audience-sites.js \
 && node --check /app/platform-operator.js \
 && node /tmp/lien-v637/verify-runtime.mjs

ENTRYPOINT ["lien-entrypoint"]
CMD ["node", "server.js"]

USER nextjs
