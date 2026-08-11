# syntax=docker/dockerfile:1

# ---------- Builder ----------
# Installs *all* deps (incl. devDependencies - tsc/eslint etc. are dev-only) and compiles
# src/ -> dist/. `npm run build` also triggers the `postbuild` script (npm lifecycle), which
# generates public/index.html from README.md.
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Runtime ----------
# Slim image: only production deps + the build output (dist/, public/) - no source, no
# devDependencies, no README/scripts left behind.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Must match the `PORT` env var configured on Northflank for this service.
EXPOSE 8080

CMD ["node", "dist/index.js"]
