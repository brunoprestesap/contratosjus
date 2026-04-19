import { request } from "@playwright/test";

/**
 * Chama o endpoint de seed do app (`POST /api/e2e/seed`) — só ativo
 * quando `NODE_ENV=test`. Evita importar Prisma no runtime do Playwright
 * (o cliente gerado usa `import.meta.url` e não transpila nele).
 */

export interface SeededData {
  user: { id: string; email: string; name: string; role: "FISCAL" };
  contract: { id: string; contractNumber: string; object: string };
}

const BASE_URL = "http://localhost:3001";

export async function seedE2E(): Promise<SeededData> {
  const ctx = await request.newContext();
  const res = await ctx.post(`${BASE_URL}/api/e2e/seed`);
  const body = await res.text();
  if (!res.ok()) {
    throw new Error(`Seed E2E falhou (status ${res.status()}): ${body}`);
  }
  const data = JSON.parse(body) as SeededData;
  await ctx.dispose();
  return data;
}
