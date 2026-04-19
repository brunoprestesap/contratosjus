import type { z } from "zod/v4";
import { logger } from "@/lib/logger";
import type { ComprasPagedResponse } from "@/types/compras-dadosabertos";

/**
 * Erro lançado quando a resposta JSON da IA não pôde ser parseada.
 * Diferente de "IA respondeu que não tem sugestão" — aqui o contrato quebrou.
 * Action de topo converte em mensagem segura para o cliente.
 */
export class AIResponseError extends Error {
  constructor(
    public readonly purpose: string,
    public readonly rawResponse: string,
    cause?: unknown,
  ) {
    super(`Resposta inválida da IA em ${purpose}`);
    this.name = "AIResponseError";
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Normaliza resposta paginada da API Dados Abertos. O endpoint ora devolve
 * `_embedded.resultado`, ora `resultado`, ora `_embedded.itens` — tratamos
 * os três formatos. Resposta-array crua também é aceita para robustez.
 */
export function extractResultado<T>(body: ComprasPagedResponse<T> | T[] | null | undefined): T[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  return body._embedded?.resultado ?? body.resultado ?? body._embedded?.itens ?? [];
}

/**
 * Parse defensivo de JSON proveniente de LLM. Quando o modelo envolve o
 * payload em prosa ou code fences (```json ... ```), extraímos o primeiro
 * objeto delimitado por chaves. Falhas são loggadas e resultam em
 * `AIResponseError` — nunca em silent fallback — para que a action
 * informe explicitamente o usuário.
 */
export function extractJson<T>(text: string, purpose: string): T {
  const trimmed = text.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    logger.warn(
      { event: "ai.parse.no_json", purpose, rawLength: trimmed.length },
      "Resposta da IA sem objeto JSON",
    );
    throw new AIResponseError(purpose, text);
  }
  try {
    return JSON.parse(match[0]) as T;
  } catch (cause) {
    logger.warn(
      { event: "ai.parse.invalid_json", purpose, err: cause },
      "Falha ao parsear JSON da IA",
    );
    throw new AIResponseError(purpose, text, cause);
  }
}

/**
 * Variante tolerante para usos onde ausência de JSON é esperada
 * (ex.: modelo pode legitimamente retornar string vazia). Retorna `null`
 * em vez de lançar. Ainda emite log de warn para observabilidade.
 */
export function tryExtractJson<T>(text: string, purpose: string): T | null {
  try {
    return extractJson<T>(text, purpose);
  } catch {
    return null;
  }
}

export interface ParseResultadoOptions {
  /**
   * Acima deste percentual de descarte, emite log agregado sinalizando
   * possível drift de contrato da API externa. Default 10%.
   */
  warnThresholdPct?: number;
}

/**
 * Valida cada row de uma resposta paginada contra um schema Zod.
 * Rows inválidas são descartadas com log estruturado (modo degradado)
 * em vez de abortar a operação inteira — uma mudança pontual no
 * contrato da API não deve bloquear uma consulta de 200 amostras.
 *
 * Se a taxa de descarte passar do threshold, emite log agregado para
 * alertar observabilidade sobre provável drift.
 */
export function parseResultadoWithSchema<T>(
  rows: readonly unknown[],
  schema: z.ZodType<T>,
  purpose: string,
  opts: ParseResultadoOptions = {},
): T[] {
  const valid: T[] = [];
  let dropped = 0;
  for (let i = 0; i < rows.length; i++) {
    const res = schema.safeParse(rows[i]);
    if (res.success) {
      valid.push(res.data);
    } else {
      dropped += 1;
      logger.warn(
        {
          event: "api.schema.row_dropped",
          purpose,
          index: i,
          issues: res.error.issues.slice(0, 5),
        },
        "Row descartada por schema da API externa",
      );
    }
  }
  const threshold = opts.warnThresholdPct ?? 0.1;
  if (rows.length > 0 && dropped / rows.length > threshold) {
    logger.warn(
      {
        event: "api.schema.high_drop_rate",
        purpose,
        total: rows.length,
        dropped,
        rate: dropped / rows.length,
      },
      "Taxa de descarte alta — possível drift da API externa",
    );
  }
  return valid;
}
