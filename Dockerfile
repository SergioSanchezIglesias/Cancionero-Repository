FROM node:22-trixie-slim AS construccion

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/chords/package.json packages/chords/
COPY packages/api/package.json packages/api/

RUN npm ci

COPY packages/chords packages/chords
COPY packages/api packages/api

RUN npm run build && npm prune --omit=dev


FROM node:22-trixie-slim

ENV NODE_ENV=production \
    DB_PATH=/data/app.db \
    PORT=3000

WORKDIR /app

RUN mkdir -p /data && chown node:node /data

COPY --from=construccion /app/node_modules node_modules
COPY --from=construccion /app/package.json ./
COPY --from=construccion /app/packages/chords/package.json packages/chords/
COPY --from=construccion /app/packages/chords/dist packages/chords/dist
COPY --from=construccion /app/packages/api/package.json packages/api/
COPY --from=construccion /app/packages/api/dist packages/api/dist

USER node

EXPOSE 3000

CMD ["node", "packages/api/dist/servidor.js"]
