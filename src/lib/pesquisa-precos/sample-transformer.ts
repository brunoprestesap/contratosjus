import { Prisma } from "@/generated/prisma/client";
import type { PrecoPraticadoMaterial, PrecoPraticadoServico } from "@/types/compras-dadosabertos";
import { inferLegalRegime } from "@/lib/pesquisa-precos/legal-regime";

export type PrecoRow = PrecoPraticadoMaterial | PrecoPraticadoServico;

/**
 * A API expõe `modalidade` ora como string (ex.: "Pregão Eletrônico") ora
 * como código numérico inteiro. O banco guarda texto — normalizamos aqui.
 */
export function modalidadeToDb(v: string | number | null | undefined): string | null {
  if (v == null) return null;
  return typeof v === "number" ? String(v) : v;
}

/**
 * Identificador estável da amostra. Preferimos `idItemCompra` (mais específico),
 * caímos para `idCompra` (granularidade de compra), e em último caso compomos
 * um identificador sintético. Usado como chave única para deduplicação.
 */
export function buildSampleIdentifier(row: PrecoRow): string {
  return String(
    row.idItemCompra ??
      row.idCompra ??
      `${row.codigoUasg ?? "UASG"}-${row.numeroItemCompra ?? "?"}`,
  );
}

/**
 * Converte payload arbitrário da API em `Prisma.InputJsonValue` de forma
 * segura. O round-trip via JSON.stringify remove `undefined`s e métodos,
 * produzindo um valor que o Prisma aceita sem cast duplo `as unknown as`.
 */
function toJsonPayload(row: PrecoRow): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue;
}

/**
 * Transforma uma linha da API Dados Abertos em um registro pronto para
 * `prisma.priceSample.createMany`. A multiplicação `precoUnitario × quantidade`
 * usa `Prisma.Decimal` para preservar precisão em quantidades fracionadas
 * (ex.: 1.1 × 3.3 em float drift a 3.6300000000000003).
 */
export function rowToSampleCreate(
  row: PrecoRow,
  researchId: string,
  researchItemId: string | null = null,
): Prisma.PriceSampleCreateManyInput {
  const quantidade = row.quantidade ?? 1;
  const precoUnit = row.precoUnitario ?? 0;
  const valorTotal = new Prisma.Decimal(precoUnit).mul(new Prisma.Decimal(quantidade));
  const dataAssinatura = row.dataCompra ? new Date(row.dataCompra) : null;

  return {
    researchId,
    researchItemId,
    pncpNumeroControle: buildSampleIdentifier(row),
    pncpContractId: row.idCompra != null ? String(row.idCompra) : null,
    orgao: row.nomeOrgao ?? row.nomeUasg ?? null,
    cnpjFornecedor: row.niFornecedor ?? null,
    objetoResumo: row.descricaoDetalhadaItem ?? row.descricaoItem ?? row.objetoCompra ?? "",
    valorGlobal: valorTotal,
    valorMensal: null,
    dataAssinatura,
    modalidade: modalidadeToDb(row.modalidade),
    uf: row.estado ?? null,
    legalRegimeInferred: inferLegalRegime(row.modalidade, dataAssinatura),
    rawPayload: toJsonPayload(row),
  };
}

/**
 * Filtra + transforma em um passo: descarta linhas com valor zerado
 * (preco ausente ou quantidade=0) que não agregam à análise estatística.
 */
export function rowsToValidSamples(
  rows: readonly PrecoRow[],
  researchId: string,
  researchItemId: string | null = null,
): Prisma.PriceSampleCreateManyInput[] {
  const out: Prisma.PriceSampleCreateManyInput[] = [];
  for (const row of rows) {
    const sample = rowToSampleCreate(row, researchId, researchItemId);
    if (sample.valorGlobal instanceof Prisma.Decimal && sample.valorGlobal.gt(0)) {
      out.push(sample);
    }
  }
  return out;
}
