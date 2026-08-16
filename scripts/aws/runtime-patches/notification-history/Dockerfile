ARG BASE_IMAGE
FROM ${BASE_IMAGE}

COPY patch-runtime.mjs /tmp/notification-history-patch.mjs
COPY notification-history-client.js /tmp/notification-history-client.js
RUN node /tmp/notification-history-patch.mjs
