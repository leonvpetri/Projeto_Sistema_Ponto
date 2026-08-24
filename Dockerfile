# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY tsconfig.json nest-cli.json .swcrc ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Datas de "dia" (YYYY-MM-DD) já são tratadas como locais no código
# (parseDataISO/formatDataISO, ver src/apuracao/date-utils.ts) independente
# do fuso do host — isso aqui é só uma camada extra de proteção caso algum
# `new Date(string)` problemático escape essa disciplina no futuro: rodando
# em UTC, esse tipo de bug (meia-noite local != meia-noite UTC) não existe.
ENV TZ=UTC

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
