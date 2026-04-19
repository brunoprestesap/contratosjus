import type { PrecoFilters } from "@/lib/compras-dadosabertos";
import { extractResultado } from "@/lib/pesquisa-precos/response-parser";
import { logger } from "@/lib/logger";
import type { ComprasPagedResponse } from "@/types/compras-dadosabertos";
import type { PrecoRow } from "@/lib/pesquisa-precos/sample-transformer";

/**
 * Cap de segurança — evita que uma consulta aberta (ex.: CATSER comum,
 * período longo, sem filtro de UF) trave a pesquisa puxando milhares de
 * amostras. O Manual CNJ exige no mínimo 3 amostras válidas; com 500
 * temos folga para qualquer descarte manual/IA sem refazer a consulta.
 */
export const DEFAULT_MAX_SAMPLES = 500;

/**
 * Tamanho máximo de página aceito empiricamente pela API Dados Abertos.
 * Valores maiores ora retornam 400, ora são silenciosamente truncados.
 */
export const DEFAULT_PAGE_SIZE = 200;

export type PrecoFetcher<T extends PrecoRow = PrecoRow> = (
  filters: PrecoFilters,
) => Promise<ComprasPagedResponse<T>>;

export interface FetchAllPrecosOptions<T extends PrecoRow = PrecoRow> {
  fetcher: PrecoFetcher<T>;
  baseFilters: Omit<PrecoFilters, "pagina" | "tamanhoPagina">;
  maxSamples?: number;
  pageSize?: number;
}

/**
 * Pagina a API Dados Abertos até um dos critérios de parada:
 *   - acumular `maxSamples` amostras
 *   - atingir a última página (`totalPaginas` ou heurística: rows < pageSize)
 *   - receber uma página vazia
 *
 * Erros de rede propagam — o caller decide sobre retry/circuit (já há
 * retry + circuit breaker no cliente HTTP em `compras-dadosabertos.ts`).
 */
export async function fetchAllPrecos<T extends PrecoRow = PrecoRow>(
  opts: FetchAllPrecosOptions<T>,
): Promise<T[]> {
  const maxSamples = opts.maxSamples ?? DEFAULT_MAX_SAMPLES;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const collected: T[] = [];

  let page = 1;
  while (collected.length < maxSamples) {
    const response = await opts.fetcher({
      ...opts.baseFilters,
      pagina: page,
      tamanhoPagina: pageSize,
    });
    const rows = extractResultado<T>(response);
    if (rows.length === 0) break;

    collected.push(...rows);

    const totalPaginas = response.totalPaginas;
    if (typeof totalPaginas === "number" && page >= totalPaginas) break;
    // Heurística: quando a API não devolve totalPaginas, uma página
    // incompleta é sinal de que esgotamos o conjunto.
    if (rows.length < pageSize) break;

    page += 1;
  }

  if (collected.length > maxSamples) {
    logger.info(
      {
        event: "pesquisa-precos.page_cap_reached",
        collected: collected.length,
        maxSamples,
      },
      "Pesquisa de preços atingiu cap de amostras",
    );
    return collected.slice(0, maxSamples);
  }
  return collected;
}
