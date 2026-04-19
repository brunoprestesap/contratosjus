# ---- deps ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` falha quando o lock tem hoists opcionais inconsistentes (ex.: @emnapi em bindings wasm).
RUN npm install --no-audit --no-fund

# ---- builder ----
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runner ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

# Prisma CLI para rodar `migrate deploy` em runtime.
# Instalar (em vez de copiar) garante que toda a árvore de transitive deps
# — @prisma/config, @prisma/engines, effect, etc. — fique em /app/node_modules,
# evitando erros tipo "Cannot find module 'effect'" ao carregar prisma.config.ts.
RUN (test -f package.json || echo '{"name":"runner","version":"0.0.0","private":true}' > package.json) && \
    npm install --no-audit --no-fund --no-save prisma@7.7.0

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
