FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/agents ./agents
COPY --from=build /app/scripts ./scripts

RUN mkdir -p /app/data/providers /app/data/runtime /app/data/managed-agents

EXPOSE 5020

CMD ["node", "dist/apps/orchestrator/main.js"]
