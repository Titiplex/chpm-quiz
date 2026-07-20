# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22.18.0-bookworm-slim
FROM ${NODE_IMAGE} AS deps
WORKDIR /app/backend
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
COPY backend/scripts ./scripts
RUN npm ci

FROM deps AS build
WORKDIR /app/backend
COPY backend ./
RUN npm run build

FROM deps AS production-deps
RUN npm prune --omit=dev

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl dumb-init openssl \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system --gid 1001 nodeapp \
  && adduser --system --uid 1001 --ingroup nodeapp nodeapp
COPY --from=build --chown=nodeapp:nodeapp /app/backend/dist ./dist
COPY --from=production-deps --chown=nodeapp:nodeapp /app/backend/node_modules ./node_modules
COPY --from=build --chown=nodeapp:nodeapp /app/backend/package.json ./package.json
COPY --from=build --chown=nodeapp:nodeapp /app/backend/prisma ./prisma
USER nodeapp
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health/live >/dev/null || exit 1
CMD ["dumb-init", "node", "dist/main.js"]
