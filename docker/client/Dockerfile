# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH
WORKDIR /monolith
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
ARG VITE_API_HOST=/api
ENV VITE_API_HOST=$VITE_API_HOST
COPY . .
RUN --mount=type=cache,id=monolith-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
RUN pnpm --filter @monolith/client run build

FROM nginx:stable-alpine AS production
RUN apk add --no-cache curl
COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /monolith/apps/web/dist /usr/share/nginx/html
# Preserve upstream attribution with the redistributed client.
COPY --from=builder /monolith/LICENSE /monolith/THIRD_PARTY_NOTICES.md /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail --silent http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
