# syntax=docker/dockerfile:1.7

# =============================================================================
# Stage 1: build everything (api-server bundle + dashboard static files)
# =============================================================================
FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /repo

# Copy the workspace manifests first so dependency installation is cached
# independently of source changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./
COPY scripts/package.json scripts/
COPY lib/db/package.json lib/db/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/sendprint/package.json artifacts/sendprint/
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Now bring in the actual source.
COPY lib lib
COPY artifacts/api-server artifacts/api-server
COPY artifacts/sendprint artifacts/sendprint

# Regenerate the API client/zod from openapi.yaml then build the
# typescript libs, the dashboard, and the api-server bundle.
RUN pnpm --filter @workspace/api-spec run codegen
RUN pnpm -w run typecheck:libs
RUN PORT=5173 BASE_PATH=/ NODE_ENV=production \
    pnpm --filter @workspace/sendprint run build
RUN pnpm --filter @workspace/api-server run build

# Produce a self-contained runtime tree for api-server (only prod deps,
# with the right native libsql binary for the target architecture).
RUN pnpm --filter @workspace/api-server deploy --prod --legacy /deploy

# =============================================================================
# Stage 2: minimal runtime image
# =============================================================================
FROM node:22-bookworm-slim AS runtime

LABEL org.opencontainers.image.title="SendPrint Bridge"
LABEL org.opencontainers.image.description="Local web bridge: receives ZPL from Promesse and forwards it to a Zebra label printer over TCP:9100."
LABEL org.opencontainers.image.source="https://github.com/your-org/sendprint"

ENV NODE_ENV=production \
    STORAGE=sqlite \
    DATA_DIR=/data \
    PORT=8080 \
    STATIC_DIR=/app/public

WORKDIR /app

# Copy the api-server bundle, its runtime node_modules, and the built
# dashboard static files.
COPY --from=builder /deploy/dist ./dist
COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /deploy/package.json ./package.json
COPY --from=builder /repo/artifacts/sendprint/dist/public ./public

# Persistent state lives here — mount a volume to /data to keep the
# SQLite database across upgrades.
RUN mkdir -p /data && chown -R node:node /data /app
VOLUME ["/data"]

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/healthz').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
