/**
 * Smoke test das APIs externas usando os clients reais do projeto.
 * Rodar com: npx tsx scripts/smoke-apis.ts
 */
import "dotenv/config";
import { getPrecoMaterial } from "../src/lib/compras-dadosabertos";
import { callMaritaca } from "../src/lib/ai/client";
import { computeStats } from "../src/lib/statistics";

async function testComprasDadosAbertos() {
  console.log("\n=== dadosabertos.compras.gov.br ===");
  const res = await getPrecoMaterial({
    codigoItemCatalogo: 459879, // papel A4
    dataCompraInicio: "2023-01-01",
    dataCompraFim: "2025-12-31",
    tamanhoPagina: 50,
  });
  const rows =
    res._embedded?.resultado ??
    res.resultado ??
    [];
  console.log(
    `totalRegistros: ${res.totalRegistros}, retornados: ${rows.length}`
  );
  if (rows.length > 0) {
    const precos = rows
      .map((r) =>
        typeof r.precoUnitario === "number" && typeof r.quantidade === "number"
          ? r.precoUnitario * r.quantidade
          : r.precoUnitario ?? null
      )
      .filter((v): v is number => typeof v === "number" && v > 0);
    const stats = computeStats(precos);
    console.log("Estatísticas de preços unitários*qtd:");
    console.log(
      `  n=${stats.count} mean=R$${stats.mean.toFixed(2)} mediana=R$${stats.median.toFixed(2)} min=R$${stats.min.toFixed(2)} max=R$${stats.max.toFixed(2)} coef.var=${(stats.coefVariation * 100).toFixed(2)}%`
    );
    console.log("Exemplo primeiro registro:");
    const first = rows[0];
    console.log({
      idCompra: first.idCompra,
      descricaoItem: first.descricaoItem?.slice(0, 80),
      precoUnitario: first.precoUnitario,
      quantidade: first.quantidade,
      nomeFornecedor: first.nomeFornecedor,
      estado: first.estado,
      dataCompra: first.dataCompra,
    });
  }
}

async function testMaritaca() {
  console.log("\n=== Maritaca (sabia-3.1) ===");
  const result = await callMaritaca({
    messages: [
      {
        role: "system",
        content: "Responda em português em 1 linha.",
      },
      {
        role: "user",
        content: "Qual é o artigo da Lei 14.133/2021 que trata de prorrogação de contrato?",
      },
    ],
    temperature: 0,
    maxTokens: 120,
  });
  console.log("model:", result.model);
  console.log("usage:", result.usage);
  console.log("resposta:", result.text);
}

async function main() {
  try {
    await testComprasDadosAbertos();
  } catch (e) {
    console.error("Erro em dadosabertos:", e);
  }
  try {
    await testMaritaca();
  } catch (e) {
    console.error("Erro em Maritaca:", e);
  }
}

main().then(() => process.exit(0));
