FROM node:20-alpine

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/agent/package.json apps/agent/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/typescript-client/package.json packages/typescript-client/package.json
RUN pnpm install --frozen-lockfile --filter @wcp/agent...

COPY apps/agent apps/agent
COPY packages/contracts packages/contracts
COPY packages/typescript-client packages/typescript-client

EXPOSE 3001

CMD ["pnpm", "--filter", "@wcp/agent", "exec", "tsx", "src/server.ts"]
