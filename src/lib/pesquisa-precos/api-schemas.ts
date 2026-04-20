import { z } from "zod/v4";

/**
 * Schemas Zod para validação defensiva das respostas da API Dados Abertos
 * (https://dadosabertos.compras.gov.br). Protege contra drift de contrato:
 * se a API renomear/retipar um campo usado downstream por `rowToSampleCreate`,
 * o row é descartado com log em vez de inserir lixo no banco.
 *
 * Estratégia:
 *  - `codigoItemCatalogo` é o único campo mandatório (sem ele a row não
 *    tem uso analítico).
 *  - Demais campos são `optional()`/`nullable()` — o transformer já tem
 *    fallbacks, então ausência é aceita, mas tipo errado sinaliza drift.
 *  - `passthrough()` preserva campos extras (mantém `rawPayload` íntegro
 *    para auditoria e futura análise).
 */
export const precoPraticadoRowSchema = z
  .object({
    // A API devolve `idCompra` como string (17 dígitos, estoura safe-int)
    // e `idItemCompra` como número inteiro. Aceitamos ambas as formas em
    // cada campo para resistir a variação — `buildSampleIdentifier`
    // normaliza para string via `String(...)`.
    idCompra: z.union([z.string(), z.number()]).optional(),
    idItemCompra: z.union([z.string(), z.number()]).optional(),
    codigoItemCatalogo: z.number().int(),
    descricaoItem: z.string().optional(),
    descricaoDetalhadaItem: z.string().nullable().optional(),
    numeroItemCompra: z.number().optional(),
    nomeUasg: z.string().optional(),
    codigoUasg: z.string().optional(),
    quantidade: z.number().nullable().optional(),
    precoUnitario: z.number().nullable().optional(),
    niFornecedor: z.string().nullable().optional(),
    nomeOrgao: z.string().optional(),
    estado: z.string().nullable().optional(),
    modalidade: z.union([z.string(), z.number()]).nullable().optional(),
    dataCompra: z.string().nullable().optional(),
    objetoCompra: z.string().nullable().optional(),
  })
  .loose();

export type PrecoPraticadoRowParsed = z.infer<typeof precoPraticadoRowSchema>;
