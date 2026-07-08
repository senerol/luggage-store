# --- deps: install once, reused by later stages ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- build: compile TS and generate the Prisma client ---
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- runtime ---
# Keeps the full node_modules (including the `prisma` CLI, needed at
# startup to run migrations) rather than a prod-only reinstall - simpler
# and more reliable than having the container reach npm's registry at
# boot time to fetch `prisma` via npx.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

EXPOSE 4000
# This repo has no committed prisma/migrations history (it was built without
# a live Postgres instance available to generate one against - see README).
# `db push` syncs the schema directly from schema.prisma instead, which is
# safe to run on every boot. Once you have a real environment, prefer
# `npm run prisma:migrate` locally to start a proper migration history, and
# switch this to `prisma migrate deploy` for that history to be applied here.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
