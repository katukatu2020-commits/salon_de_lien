FROM 009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:staff-customer-chat-20260812-04
USER root
WORKDIR /app
COPY patch-nav.js /tmp/patch-nav.js
RUN node /tmp/patch-nav.js
USER nextjs
CMD ["node", "server.js"]
