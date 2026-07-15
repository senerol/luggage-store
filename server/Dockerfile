# --- deps: install once, reused by later stages ---
FROM node:20-bookworm AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci


# --- build: compile TS and generate the Prisma client ---
FROM node:20-bookworm AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build


# --- runtime ---
FROM node:20-bookworm AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY package.json ./

EXPOSE 4000

# Sync Prisma schema with PostgreSQL and then start backend
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]