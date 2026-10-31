# --- Stage 1: The Builder ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# --- Stage 2: Runtime ---
FROM node:20-alpine

WORKDIR /app

# Reuse the already-installed node_modules from builder — no second npm install needed
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["npm", "start"]
