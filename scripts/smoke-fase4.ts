/**
 * Smoke test Fase 4 — fillFreeField e coherenceCheck.
 * Rodar com: npx tsx scripts/smoke-fase4.ts
 */
import "dotenv/config";
import { coherenceCheck, fillFreeField } from "../src/lib/ai/generate";

const contratoMock = {
  numero: "NCE 001/2026",
  processo: "0000.1234/2026-00",
  objeto: "Prestação de serviços de vigilância armada na sede da JFAP",
  fornecedor: "SEGURANÇA PATRIMONIAL LTDA",
  cnpjFornecedor: "12345678000190",
  valorGlobal: 1200000,
  valorMensalEstimado: 100000,
  vigenciaInicio: "2025-06-01",
  vigenciaFim: "2026-05-31",
  fiscal: "João da Silva",
};

async function testFillFreeField() {
  console.log("\n=== fillFreeField — Justificativa para prorrogação ===");
  const t0 = Date.now();
  const result = await fillFreeField({
    templateTitle: "Solicitação de Parecer Jurídico",
    sectionLabel: "Fundamentação da Solicitação",
    lawRegime: "LEI_14133_2021",
    contractData: contratoMock,
    userHint: "Destacar economicidade e continuidade do serviço",
  });
  console.log(`elapsed: ${Date.now() - t0}ms`);
  console.log("tokens:", result.log.inputTokens + "in +", result.log.outputTokens + "out");
  console.log("texto:\n", result.text.slice(0, 500) + (result.text.length > 500 ? "..." : ""));
}

async function testCoherenceCheck() {
  console.log("\n=== coherenceCheck — draft com inconsistência ===");
  const t0 = Date.now();
  const result = await coherenceCheck({
    templateTitle: "Minuta de Termo Aditivo (Prorrogação)",
    lawRegime: "LEI_14133_2021",
    draft: {
      contratoNumero: "NCE 001/2026",
      valorGlobalOriginal: 1200000,
      novoValorGlobal: 1200000,
      dataAtualFimVigencia: "2026-05-31",
      novaDataFimVigencia: "2027-05-31",
      fundamentacao:
        "Com base no art. 57 da Lei 8.666/93, solicita-se a prorrogação do contrato por mais 12 meses, com valor total de R$ 1.300.000,00, sendo R$ 100.000,00 mensais.",
      // ⚠ Inconsistências propositais:
      //  - cita Lei 8.666 quando é contrato 14.133
      //  - valor 1.300.000 na justificativa mas 1.200.000 nos campos
      //  - 100k x 12 = 1.2M, não 1.3M
    },
  });
  console.log(`elapsed: ${Date.now() - t0}ms`);
  console.log("tokens:", result.log.inputTokens + "in +", result.log.outputTokens + "out");
  console.log("ok:", result.ok);
  console.log("warnings:");
  for (const w of result.warnings) {
    console.log(`  [${w.severidade}] ${w.campo ?? "—"}: ${w.mensagem}`);
  }
}

async function main() {
  try {
    await testFillFreeField();
  } catch (e) {
    console.error("fillFreeField error:", e);
  }
  try {
    await testCoherenceCheck();
  } catch (e) {
    console.error("coherenceCheck error:", e);
  }
}

main().then(() => process.exit(0));
