# syntax=docker/dockerfile:1.7
FROM golang:1.27.2-bookworm AS go-toolchain
FROM node:22-bookworm-slim AS toolchain
ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH
WORKDIR /monolith
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

FROM toolchain AS builder
COPY --from=go-toolchain /usr/local/go /usr/local/go
ENV PATH=/usr/local/go/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
ARG VITE_API_HOST=/api
ENV VITE_API_HOST=$VITE_API_HOST
COPY . .
RUN --mount=type=cache,id=monolith-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
# Builds shared packages first, then every selected module and the API.
RUN pnpm exec turbo build --filter="./packages/*" \
    && pnpm exec turbo build --continue --filter="!@monolith/site" --filter="!@monolith/desktop"
RUN pnpm exec go build -C apps/gateway -trimpath -o /monolith/monolith-gateway ./cmd/monolith

FROM toolchain AS production
ARG MONOLITH_VERSION=0.0.0
ARG MONOLITH_SCHEMA_HASH=development
LABEL org.opencontainers.image.version=$MONOLITH_VERSION
LABEL app.monolith.schema=$MONOLITH_SCHEMA_HASH
ENV MONOLITH_RELEASE_VERSION=$MONOLITH_VERSION
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl postgresql-client chromium graphicsmagick ghostscript fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
# Keep workspace symlinks, schema sources and CLI together for the migration service.
# Module bundles externalize workspace packages; a bare API-only copy cannot resolve them.
COPY --from=builder --chown=node:node /monolith /monolith
RUN chmod +x /monolith/docker/server/*.sh \
    && mkdir -p /monolith/storage && chown node:node /monolith/storage
ENV NODE_ENV=production
ENV ROOT_DIR=/monolith
ENV FILE_STORAGE_LOCAL_PATH=/monolith/storage
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PORT=3636
USER node
EXPOSE 3636
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail --silent http://localhost:3636/status || exit 1
ENTRYPOINT ["/monolith/docker/server/entrypoint.sh"]
