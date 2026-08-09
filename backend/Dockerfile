FROM node:20.19-bookworm-slim AS dependencies
WORKDIR /app
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/prisma ./prisma
COPY backend/prisma.config.ts ./
RUN ./node_modules/.bin/prisma generate

FROM dependencies AS build
COPY backend/tsconfig.json backend/eslint.config.js ./
COPY backend/src ./src
COPY backend/scripts ./scripts
RUN npm run build

FROM dependencies AS migrator
COPY backend/prisma ./prisma
COPY backend/prisma.config.ts ./
ENTRYPOINT ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM node:20.19-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/var/media && chown -R node:node /app/var/media
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
