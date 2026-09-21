FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG NEXT_PUBLIC_APP_URL=http://localhost:5021
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:5020

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5021
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs

EXPOSE 5021

CMD ["npm", "run", "start"]
