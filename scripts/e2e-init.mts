/**
 * Setup idempotente do banco de E2E.
 *
 *   1. Garante que o database `contratos_test` existe no Postgres local
 *      (o mesmo container definido em docker-compose.yml).
 *   2. Aplica todas as migrations Prisma nele.
 *
 * Roda com: `npm run test:e2e:init`.
 * Reexecutar é seguro — ambas as etapas são idempotentes.
 */

import { Client } from "pg";
import { spawnSync } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

const TEST_DB_URL = process.env.DATABASE_URL;
if (!TEST_DB_URL) {
  console.error("DATABASE_URL não definido em .env.test");
  process.exit(1);
}

// Deriva URL do banco admin (`postgres`) mantendo host/porta/credenciais
// do DATABASE_URL de teste. Usada só para o CREATE DATABASE.
function toAdminUrl(url: string): { adminUrl: string; testDbName: string } {
  const parsed = new URL(url);
  const testDbName = parsed.pathname.replace(/^\//, "").split("?")[0];
  if (!testDbName) {
    throw new Error("DATABASE_URL sem nome de banco");
  }
  parsed.pathname = "/postgres";
  // `postgres` não precisa do search/schema — limpar para evitar ruído.
  parsed.search = "";
  return { adminUrl: parsed.toString(), testDbName };
}

async function ensureDatabase() {
  const { adminUrl, testDbName } = toAdminUrl(TEST_DB_URL!);
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [testDbName]);
    if (res.rows.length === 0) {
      // Identifier deve ser escapado (sem params em DDL). testDbName foi
      // extraído do DATABASE_URL próprio — confiável neste contexto.
      await client.query(`CREATE DATABASE "${testDbName.replace(/"/g, '""')}"`);
      console.log(`[e2e-init] database "${testDbName}" criado`);
    } else {
      console.log(`[e2e-init] database "${testDbName}" já existe`);
    }
  } finally {
    await client.end();
  }
}

function runMigrations() {
  console.log("[e2e-init] prisma migrate deploy");
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

await ensureDatabase();
runMigrations();
console.log("[e2e-init] OK");
