# FORK hosted demo image: Next.js server plus git (worktrees) and Node (the
# demo repository's checks). Works on Render, Nebius Serverless Endpoints, or
# any container host.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    FORK_HOSTED_DEMO=1
COPY --from=build /app ./
RUN useradd --create-home fork && chown -R fork /app
USER fork
EXPOSE 3000
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT}"]
