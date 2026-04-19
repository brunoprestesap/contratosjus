import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { runE2ESeed } from "@/lib/e2e/seed";

/**
 * Endpoint de seed usado APENAS em ambiente de teste E2E. Gated pela
 * env `E2E_ENABLED` (presente só em `.env.test`). Fica invisível (404)
 * em qualquer outro ambiente — defesa em profundidade: proxy já bloqueia
 * antes, e esta rota rejeita mesmo que o proxy seja reconfigurado.
 */
function isTestEnv(): boolean {
  return process.env.E2E_ENABLED === "true";
}

export async function POST() {
  if (!isTestEnv()) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const data = await runE2ESeed();
    return NextResponse.json(data);
  } catch (error) {
    logger.error({ err: error, route: "api.e2e.seed" }, "Falha no seed E2E");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "seed failed" },
      { status: 500 },
    );
  }
}
