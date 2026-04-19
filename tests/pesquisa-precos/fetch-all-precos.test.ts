import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_MAX_SAMPLES,
  DEFAULT_PAGE_SIZE,
  fetchAllPrecos,
  type PrecoFetcher,
} from "@/lib/pesquisa-precos/fetch-all-precos";
import type { ComprasPagedResponse } from "@/types/compras-dadosabertos";
import type { PrecoRow } from "@/lib/pesquisa-precos/sample-transformer";

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function makeRows(count: number, offset = 0): PrecoRow[] {
  return Array.from({ length: count }, (_, i) => ({
    idCompra: `id-${offset + i}`,
    codigoItemCatalogo: 123,
    precoUnitario: 100,
    quantidade: 1,
  }));
}

function pagedResponse(rows: PrecoRow[], totalPaginas?: number): ComprasPagedResponse<PrecoRow> {
  return {
    _embedded: { resultado: rows },
    ...(totalPaginas !== undefined ? { totalPaginas } : {}),
  };
}

describe("fetchAllPrecos", () => {
  it("retorna array vazio quando a primeira página está vazia", async () => {
    const fetcher: PrecoFetcher = vi.fn(async () => pagedResponse([]));
    const out = await fetchAllPrecos({
      fetcher,
      baseFilters: { codigoItemCatalogo: 1 },
    });
    expect(out).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("para após uma única página quando totalPaginas=1", async () => {
    const fetcher: PrecoFetcher = vi.fn(async () => pagedResponse(makeRows(50), 1));
    const out = await fetchAllPrecos({
      fetcher,
      baseFilters: { codigoItemCatalogo: 1 },
    });
    expect(out).toHaveLength(50);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("itera múltiplas páginas até totalPaginas", async () => {
    const rowsByPage: PrecoRow[][] = [
      makeRows(DEFAULT_PAGE_SIZE, 0),
      makeRows(DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE),
      makeRows(50, DEFAULT_PAGE_SIZE * 2),
    ];
    const fetcher: PrecoFetcher = vi.fn(async ({ pagina }) =>
      pagedResponse(rowsByPage[(pagina ?? 1) - 1], 3),
    );

    const out = await fetchAllPrecos({
      fetcher,
      baseFilters: { codigoItemCatalogo: 1 },
    });
    expect(out).toHaveLength(DEFAULT_PAGE_SIZE * 2 + 50);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("para quando rows.length < pageSize mesmo sem totalPaginas", async () => {
    let page = 0;
    const fetcher: PrecoFetcher = vi.fn(async () => {
      page++;
      // página 1 = cheia; página 2 = parcial → heurística de parada
      return pagedResponse(page === 1 ? makeRows(DEFAULT_PAGE_SIZE) : makeRows(10));
    });

    const out = await fetchAllPrecos({
      fetcher,
      baseFilters: { codigoItemCatalogo: 1 },
    });
    expect(out).toHaveLength(DEFAULT_PAGE_SIZE + 10);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("para quando página vazia no meio (defesa contra API instável)", async () => {
    let page = 0;
    const fetcher: PrecoFetcher = vi.fn(async () => {
      page++;
      return pagedResponse(page === 1 ? makeRows(DEFAULT_PAGE_SIZE) : []);
    });

    const out = await fetchAllPrecos({
      fetcher,
      baseFilters: { codigoItemCatalogo: 1 },
    });
    expect(out).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("respeita maxSamples (cap)", async () => {
    const fetcher: PrecoFetcher = vi.fn(async ({ pagina }) =>
      pagedResponse(makeRows(DEFAULT_PAGE_SIZE, ((pagina ?? 1) - 1) * DEFAULT_PAGE_SIZE), 10),
    );

    const out = await fetchAllPrecos({
      fetcher,
      baseFilters: { codigoItemCatalogo: 1 },
      maxSamples: 250,
    });
    expect(out).toHaveLength(250);
    // 250 exige 2 páginas de 200 (=400 coletadas, truncadas pra 250)
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("passa filtros base + paginação ao fetcher", async () => {
    const fetcher: PrecoFetcher = vi.fn(async () => pagedResponse([]));
    await fetchAllPrecos({
      fetcher,
      baseFilters: { codigoItemCatalogo: 42, estado: "AP", poder: "Judiciario" },
      pageSize: 50,
    });
    expect(fetcher).toHaveBeenCalledWith({
      codigoItemCatalogo: 42,
      estado: "AP",
      poder: "Judiciario",
      pagina: 1,
      tamanhoPagina: 50,
    });
  });

  it("usa DEFAULT_MAX_SAMPLES e DEFAULT_PAGE_SIZE quando não fornecidos", async () => {
    const fetcher: PrecoFetcher = vi.fn(async () => pagedResponse([]));
    await fetchAllPrecos({ fetcher, baseFilters: { codigoItemCatalogo: 1 } });
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({ tamanhoPagina: DEFAULT_PAGE_SIZE }),
    );
    // Sanity: cap é alto o bastante para a maioria dos casos
    expect(DEFAULT_MAX_SAMPLES).toBeGreaterThanOrEqual(100);
  });
});
