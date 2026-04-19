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
