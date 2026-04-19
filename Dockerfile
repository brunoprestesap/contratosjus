# ---- builder ----
# Stage único de deps+build: copiar node_modules entre stages num FS lento
# (overlayfs em disco saturado) levava ~5min só no COPY. Ao consolidar, o
# Docker ainda cacheia a layer do npm install enquanto package.json/lock não
# mudarem, então o ganho de cache não se perde. O cache mount do BuildKit
# reaproveita ~/.npm entre builds, cortando ~70% do tempo de reinstalação.
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` falha quando o lock tem hoists opcionais inconsistentes (ex.: @emnapi em bindings wasm).
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund
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
RUN --mount=type=cache,target=/root/.npm \
    (test -f package.json || echo '{"name":"runner","version":"0.0.0","private":true}' > package.json) && \
    npm install --no-audit --no-fund --no-save prisma@7.7.0

# Entrypoint: roda `prisma migrate deploy` antes de iniciar o servidor.
# `migrate deploy` é idempotente — seguro em re-runs do container.
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
