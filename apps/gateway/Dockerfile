FROM node:20-alpine

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/agent/package.json apps/agent/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY packages/typescript-client/package.json packages/typescript-client/package.json
RUN pnpm install --frozen-lockfile --filter @wcp/gateway...

COPY apps/gateway apps/gateway
COPY apps/agent apps/agent
COPY packages/contracts packages/contracts
COPY packages/observability packages/observability
COPY packages/typescript-client packages/typescript-client

EXPOSE 3000

CMD ["pnpm", "--filter", "@wcp/gateway", "exec", "tsx", "src/server.ts"]
