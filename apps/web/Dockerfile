FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@9

COPY package.json pnpm-lock.json ./
RUN pnpm install --frozen-lockfile

COPY src/ ./src/
COPY index.html vite.config.ts tsconfig.json ./

RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
