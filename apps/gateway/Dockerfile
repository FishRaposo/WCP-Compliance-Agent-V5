FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY src/ ./src/
COPY tsconfig.json ./

EXPOSE 3000

CMD ["pnpm", "exec", "tsx", "src/server.ts"]
