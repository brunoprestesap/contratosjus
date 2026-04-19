#!/bin/sh
set -e

# Invoca o prisma local via `node` direto, evitando `npx` (que baixa versão nova
# em vez de usar a instalada) e o shebang do wrapper em node_modules/.bin/prisma
# (que falhou com "not found" no CMD exec(), ainda que funcionasse em shell interativo).
echo "[entrypoint] Aplicando migrations (prisma migrate deploy)..."
node /app/node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Iniciando servidor Next.js..."
exec node /app/server.js
