FROM python:3.12.12-slim-bookworm@sha256:593bd06efe90efa80dc4eee3948be7c0fde4134606dd40d8dd8dbcade98e669c AS python-runtime
FROM node:24.10.0-bookworm-slim AS node-runtime

FROM ubuntu:26.04@sha256:b7f48194d4d8b763a478a621cdc81c27be222ba2206ca3ca6bc42b49685f3d9e

COPY --from=python-runtime /usr/local /usr/local
COPY --from=node-runtime /usr/local /usr/local

ENV PATH="/usr/local/bin:${PATH}"
