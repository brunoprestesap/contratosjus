/**
 * Smoke test da estratégia hierárquica de sugestão CATMAT/CATSER.
 * Rodar com: npx tsx scripts/smoke-hierarchy.ts
 */
import "dotenv/config";
import { suggestCatmatHierarchy, suggestCatserHierarchy } from "../src/lib/ai/generate";

async function runMaterial() {
  console.log("\n=== CATMAT hierárquico ===");
  const objeto =
    "Aquisição de resmas de papel A4 75g/m², na cor branca, para uso em impressoras e copiadoras";
  console.log("Objeto:", objeto);
  const t0 = Date.now();
  const result = await suggestCatmatHierarchy(objeto);
  console.log("elapsed:", Date.now() - t0, "ms");
  console.log("success:", result.success);
  if (result.reason) console.log("reason:", result.reason);
  console.log("CAMINHO (trail):");
  for (const step of result.trail) {
    console.log(
      `  ${step.nivel} → [${step.codigo}] ${step.descricao} (conf=${step.confidence}, avaliados=${step.candidatosAvaliados})`,
    );
  }
  console.log(`Final: codigoItem=${result.codigoItem}, descricao=${result.descricaoItem}`);
  console.log(`AI calls: ${result.logs.length}`);
  const totalTokens = result.logs.reduce((s, l) => s + l.inputTokens + l.outputTokens, 0);
  console.log(`Total tokens: ${totalTokens}`);
}

async function runServico() {
  console.log("\n=== CATSER hierárquico ===");
  const objeto = "Contratação de serviços continuados de vigilância armada para unidade sede";
  console.log("Objeto:", objeto);
  const t0 = Date.now();
  const result = await suggestCatserHierarchy(objeto);
  console.log("elapsed:", Date.now() - t0, "ms");
  console.log("success:", result.success);
  if (result.reason) console.log("reason:", result.reason);
  console.log("CAMINHO (trail):");
  for (const step of result.trail) {
    console.log(
      `  ${step.nivel} → [${step.codigo}] ${step.descricao} (conf=${step.confidence}, avaliados=${step.candidatosAvaliados})`,
    );
  }
  console.log(`Final: codigoServico=${result.codigoServico}, descricao=${result.descricaoServico}`);
  console.log(`AI calls: ${result.logs.length}`);
  const totalTokens = result.logs.reduce((s, l) => s + l.inputTokens + l.outputTokens, 0);
  console.log(`Total tokens: ${totalTokens}`);
}

async function main() {
  try {
    await runMaterial();
  } catch (e) {
    console.error("Erro em material:", e);
  }
  try {
    await runServico();
  } catch (e) {
    console.error("Erro em serviço:", e);
  }
}

main().then(() => process.exit(0));
