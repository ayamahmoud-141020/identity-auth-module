# syntax=docker/dockerfile:1
# Build context: repository root (npm workspaces).
FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @app/shared && npm run build -w @app/api \
 && npm prune --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /repo/node_modules node_modules
COPY --from=build --chown=app:app /repo/package.json package.json
COPY --from=build --chown=app:app /repo/packages/shared/package.json packages/shared/package.json
COPY --from=build --chown=app:app /repo/packages/shared/dist packages/shared/dist
COPY --from=build --chown=app:app /repo/apps/api/package.json apps/api/package.json
COPY --from=build --chown=app:app /repo/apps/api/dist apps/api/dist
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1
CMD ["node", "apps/api/dist/main.js"]
