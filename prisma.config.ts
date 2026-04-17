import "dotenv/config";
import { defineConfig } from "prisma/config";

/** Mesmo servidor que DATABASE_URL, outro database — exigido pelo `migrate diff --from-migrations` (Prisma 7). */
function shadowDatabaseUrl(): string | undefined {
  const explicit = process.env["SHADOW_DATABASE_URL"];
  if (explicit) return explicit;
  const base = process.env["DATABASE_URL"];
  if (!base) return undefined;
  try {
    const u = new URL(base.replace(/^postgres:/, "postgresql:"));
    u.pathname = "/prisma_migrate_shadow_contratos";
    return u.toString();
  } catch {
    return undefined;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.mts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    shadowDatabaseUrl: shadowDatabaseUrl(),
  },
});
