ARG BASE_IMAGE=salon-de-lien:three-app-qa-v680-local
FROM ${BASE_IMAGE}
USER root
COPY . /qa/
ENV ORIMIA_ISOLATED_QA=v680
ENV NODE_OPTIONS=--require=/qa/mail-sink.cjs
USER nextjs
