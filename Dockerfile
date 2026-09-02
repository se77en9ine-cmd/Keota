# 39POS Enterprise Multi-Stage Production Container
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .

# Build shared, client, and server
RUN npm run build --workspaces

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/
RUN npm install --omit=dev --no-audit --no-fund --legacy-peer-deps

COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared/dist ./shared/dist

EXPOSE 5000

CMD ["node", "server/dist/server.js"]
