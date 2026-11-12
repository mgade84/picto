# syntax=docker/dockerfile:1

# --- Toolchain used for development, tests and linting (see compose.yaml) ---
FROM node:26-alpine AS dev
WORKDIR /app
# node_modules lives in a named volume; pre-create it so the volume is owned
# by the unprivileged `node` user (uid 1000) instead of root.
RUN mkdir -p /app/node_modules && chown -R node:node /app
USER node
EXPOSE 5173
CMD ["sh", "-c", "npm install --no-audit --no-fund && npm run dev"]

# --- Production build ---
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build \
    # Pre-compress text files at maximum level; nginx serves the .gz copies
    # directly (gzip_static) to clients that accept gzip.
    && find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' -o -name '*.svg' \) \
        -size +1k -exec gzip -9 -k {} \;

# --- Static runtime: the app is plain static files served by nginx ---
FROM nginx:stable-alpine AS prod
# Pick up Alpine security fixes released since the base image was built.
RUN apk upgrade --no-cache
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# Reverse proxies (and docker compose) can tell when it's ready to serve.
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
