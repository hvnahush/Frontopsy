# ---- build: compile TypeScript ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- run: Playwright's image ships Chromium and every library it needs ----
# Keep this tag in step with the "playwright" version in package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY db ./db
# Cloud Run sets PORT (8080 by default); config.ts reads it.
EXPOSE 8080
USER pwuser
CMD ["node", "dist/index.js"]
