FROM node:20-slim AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx expo export --platform web
RUN npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=server_dist

FROM base AS production

WORKDIR /app

COPY --from=build /app/server_dist ./server_dist
COPY --from=build /app/dist ./dist

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server_dist/index.js"]
