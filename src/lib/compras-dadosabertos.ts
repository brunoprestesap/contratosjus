import { CircuitBreaker } from "@/lib/circuit-breaker";
import { withRetry } from "@/lib/retry";
import type {
  CatalogoClasseMaterial,
  CatalogoDivisaoServico,
  CatalogoGrupoMaterial,
  CatalogoItemMaterial,
  CatalogoItemServico,
  CatalogoPdmMaterial,
  CatalogoSecaoServico,
  ComprasPagedResponse,
  ItemContratacao14133,
  ItemLicitacaoLegado,
  PrecoPraticadoMaterial,
  PrecoPraticadoServico,
  ResultadoItemContratacao14133,
} from "@/types/compras-dadosabertos";

const REQUEST_TIMEOUT_MS = 15000;
const CACHE_REVALIDATE_S = 300;

function baseUrl(): string {
  return process.env.COMPRAS_DADOSABERTOS_BASE_URL ?? "https://dadosabertos.compras.gov.br";
}

function circuitThreshold(): number {
  const raw = process.env.COMPRAS_DADOSABERTOS_CIRCUIT_THRESHOLD;
  const n = raw ? parseInt(raw, 10) : 3;
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export class ComprasApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ComprasApiError";
  }
}

const breaker = new CircuitBreaker({
  threshold: circuitThreshold(),
  windowMs: 60_000,
  openMs: 120_000,
});

function buildQuery(params: Record<string, unknown>): string {
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) entries.push([key, String(v)]);
    } else {
      entries.push([key, String(value)]);
    }
  }
  return entries.length ? "?" + new URLSearchParams(entries).toString() : "";
}

async function fetchApi<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
  breaker.assertClosed();
  const url = `${baseUrl()}${path}${buildQuery(params)}`;

  return withRetry<T>(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          next: { revalidate: CACHE_REVALIDATE_S },
        });
        if (!response.ok) {
          const err = new ComprasApiError(
            response.status,
            `Erro na API compras.gov.br: ${response.status}`,
          );
          if (response.status >= 500) breaker.recordFailure();
          throw err;
        }
        const body = (await response.json()) as T;
        breaker.recordSuccess();
        return body;
      } catch (error) {
        if (!(error instanceof ComprasApiError)) {
          breaker.recordFailure();
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
    { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 4000 },
  );
}

// ── Catálogo de Material ──────────────────────────────────────

export interface SearchMaterialOptions {
  descricaoItem?: string;
  codigoClasse?: number;
  codigoGrupo?: number;
  codigoPdm?: number;
  codigoNcm?: string;
  pagina?: number;
  tamanhoPagina?: number;
  statusItem?: boolean;
  bps?: boolean;
}

export async function listGruposMaterial(
  opts: { pagina?: number; tamanhoPagina?: number } = {},
): Promise<ComprasPagedResponse<CatalogoGrupoMaterial>> {
  return fetchApi<ComprasPagedResponse<CatalogoGrupoMaterial>>(
    "/modulo-material/1_consultarGrupoMaterial",
    {
      pagina: opts.pagina ?? 1,
      tamanhoPagina: opts.tamanhoPagina ?? 100,
      statusGrupo: true,
    },
  );
}

export async function listClassesMaterial(
  codigoGrupo: number,
  opts: { pagina?: number; tamanhoPagina?: number } = {},
): Promise<ComprasPagedResponse<CatalogoClasseMaterial>> {
  return fetchApi<ComprasPagedResponse<CatalogoClasseMaterial>>(
    "/modulo-material/2_consultarClasseMaterial",
    {
      codigoGrupo,
      pagina: opts.pagina ?? 1,
      tamanhoPagina: opts.tamanhoPagina ?? 100,
      statusClasse: true,
    },
  );
}

export async function listItensMaterialByClasse(
  codigoClasse: number,
  opts: { pagina?: number; tamanhoPagina?: number } = {},
): Promise<ComprasPagedResponse<CatalogoItemMaterial>> {
  return fetchApi<ComprasPagedResponse<CatalogoItemMaterial>>(
    "/modulo-material/4_consultarItemMaterial",
    {
      codigoClasse,
      pagina: opts.pagina ?? 1,
      tamanhoPagina: opts.tamanhoPagina ?? 500,
      statusItem: true,
    },
  );
}

export async function listPdmsByClasse(
  codigoClasse: number,
  opts: { pagina?: number; tamanhoPagina?: number } = {},
): Promise<ComprasPagedResponse<CatalogoPdmMaterial>> {
  return fetchApi<ComprasPagedResponse<CatalogoPdmMaterial>>(
    "/modulo-material/3_consultarPdmMaterial",
    {
      codigoClasse,
      pagina: opts.pagina ?? 1,
      tamanhoPagina: opts.tamanhoPagina ?? 500,
      statusPdm: true,
    },
  );
}

export async function listItensMaterialByPdm(
  codigoPdm: number,
  opts: { pagina?: number; tamanhoPagina?: number } = {},
): Promise<ComprasPagedResponse<CatalogoItemMaterial>> {
  return fetchApi<ComprasPagedResponse<CatalogoItemMaterial>>(
    "/modulo-material/4_consultarItemMaterial",
    {
      codigoPdm,
      pagina: opts.pagina ?? 1,
      tamanhoPagina: opts.tamanhoPagina ?? 500,
      statusItem: true,
    },
  );
}

export async function searchItemMaterialByDescricao(
  opts: SearchMaterialOptions,
): Promise<ComprasPagedResponse<CatalogoItemMaterial>> {
  return fetchApi<ComprasPagedResponse<CatalogoItemMaterial>>(
    "/modulo-material/4_consultarItemMaterial",
    {
      descricaoItem: opts.descricaoItem,
      codigoClasse: opts.codigoClasse,
      codigoGrupo: opts.codigoGrupo,
      codigoPdm: opts.codigoPdm,
      codigo_ncm: opts.codigoNcm,
      pagina: opts.pagina ?? 1,
      tamanhoPagina: opts.tamanhoPagina ?? 50,
      statusItem: opts.statusItem ?? true,
      bps: opts.bps,
    },
  );
}

// ── Catálogo de Serviço ───────────────────────────────────────

export interface SearchServicoOptions {
  codigoSecao?: number;
  codigoDivisao?: number;
  codigoGrupo?: number;
  codigoClasse?: number;
  codigoSubclasse?: number;
  codigoServico?: number;
  pagina?: number;
  tamanhoPagina?: number;
  statusServico?: boolean;
}

export async function listSecoesServico(
  opts: { pagina?: number; tamanhoPagina?: number } = {},
): Promise<ComprasPagedResponse<CatalogoSecaoServico>> {
  return fetchApi<ComprasPagedResponse<CatalogoSecaoServico>>(
    "/modulo-servico/1_consultarSecaoServico",
    {
      pagina: opts.pagina ?? 1,
      tamanhoPagina: opts.tamanhoPagina ?? 50,
      statusSecao: true,
    },
  );
}

export async function listDivisoesServico(
  codigoSecao: number,
  opts: { pagina?: number; tamanhoPagina?: number } = {},
): Promise<ComprasPagedResponse<CatalogoDivisaoServico>> {
  return fetchApi<ComprasPagedResponse<CatalogoDivisaoServico>>(
    "/modulo-servico/2_consultarDivisaoServico",
    {
      codigoSecao,
      pagina: opts.pagina ?? 1,
      tamanhoPagina: opts.tamanhoPagina ?? 100,
      statusDivisao: true,
    },
  );
}

export async function listItensServicoByDivisao(
  codigoSecao: number,
  codigoDivisao: number,
  opts: { pagina?: number; tamanhoPagina?: number } = {},
): Promise<ComprasPagedResponse<CatalogoItemServico>> {
  return fetchApi<ComprasPagedResponse<CatalogoItemServico>>(
    "/modulo-servico/6_consultarItemServico",
    {
      codigoSecao,
      codigoDivisao,
      pagina: opts.pagina ?? 1,
      tamanhoPagina: opts.tamanhoPagina ?? 300,
      statusServico: true,
    },
  );
}

export async function searchItemServico(
  opts: SearchServicoOptions,
): Promise<ComprasPagedResponse<CatalogoItemServico>> {
  return fetchApi<ComprasPagedResponse<CatalogoItemServico>>(
    "/modulo-servico/6_consultarItemServico",
    {
      codigoSecao: opts.codigoSecao,
      codigoDivisao: opts.codigoDivisao,
      codigoGrupo: opts.codigoGrupo,
      codigoClasse: opts.codigoClasse,
      codigoSubclasse: opts.codigoSubclasse,
      codigoServico: opts.codigoServico,
      pagina: opts.pagina ?? 1,
      tamanhoPagina: opts.tamanhoPagina ?? 50,
      statusServico: opts.statusServico ?? true,
    },
  );
}

// ── Pesquisa de Preços (CATMAT/CATSER) ────────────────────────

export interface PrecoFilters {
  codigoItemCatalogo: number;
  dataCompraInicio?: string; // ISO date yyyy-mm-dd
  dataCompraFim?: string;
  codigoUasg?: string;
  estado?: string; // UF
  codigoMunicipio?: number;
  codigoClasse?: number;
  poder?: string;
  esfera?: string;
  idCompra?: string;
  dataResultado?: boolean;
  pagina?: number;
  tamanhoPagina?: number;
}

export async function getPrecoMaterial(
  filters: PrecoFilters,
): Promise<ComprasPagedResponse<PrecoPraticadoMaterial>> {
  return fetchApi<ComprasPagedResponse<PrecoPraticadoMaterial>>(
    "/modulo-pesquisa-preco/1_consultarMaterial",
    { ...filters, pagina: filters.pagina ?? 1, tamanhoPagina: filters.tamanhoPagina ?? 100 },
  );
}

export async function getPrecoServico(
  filters: Omit<PrecoFilters, "codigoClasse">,
): Promise<ComprasPagedResponse<PrecoPraticadoServico>> {
  return fetchApi<ComprasPagedResponse<PrecoPraticadoServico>>(
    "/modulo-pesquisa-preco/3_consultarServico",
    { ...filters, pagina: filters.pagina ?? 1, tamanhoPagina: filters.tamanhoPagina ?? 100 },
  );
}

// ── Itens de Contratações Lei 14.133 ──────────────────────────

export interface ItensContratacoes14133Filters {
  dataInclusaoPncpInicial: string; // yyyy-mm-dd
  dataInclusaoPncpFinal: string;
  materialOuServico?: "Material" | "Servico";
  codItemCatalogo?: number;
  codigoGrupo?: number;
  codigoClasse?: number;
  codigoNCM?: string;
  orgaoEntidadeCnpj?: string;
  unidadeOrgaoCodigoUnidade?: string;
  situacaoCompraItem?: string;
  temResultado?: boolean;
  codFornecedor?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export async function searchItensContratacoes14133(
  filters: ItensContratacoes14133Filters,
): Promise<ComprasPagedResponse<ItemContratacao14133>> {
  return fetchApi<ComprasPagedResponse<ItemContratacao14133>>(
    "/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133",
    { ...filters, pagina: filters.pagina ?? 1, tamanhoPagina: filters.tamanhoPagina ?? 100 },
  );
}

export interface ResultadosItens14133Filters {
  dataResultadoPncpInicial: string;
  dataResultadoPncpFinal: string;
  orgaoEntidadeCnpj?: string;
  niFornecedor?: string;
  porteFornecedorId?: number;
  naturezaJuridicaId?: string;
  situacaoCompraItemResultadoId?: number;
  valorUnitarioHomologadoInicial?: number;
  valorUnitarioHomologadoFinal?: number;
  valorTotalHomologadoInicial?: number;
  valorTotalHomologadoFinal?: number;
  pagina?: number;
  tamanhoPagina?: number;
}

export async function getResultadosItens14133(
  filters: ResultadosItens14133Filters,
): Promise<ComprasPagedResponse<ResultadoItemContratacao14133>> {
  return fetchApi<ComprasPagedResponse<ResultadoItemContratacao14133>>(
    "/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133",
    { ...filters, pagina: filters.pagina ?? 1, tamanhoPagina: filters.tamanhoPagina ?? 100 },
  );
}

// ── Legado (Lei 8.666) ────────────────────────────────────────

export interface ItemLicitacaoLegadoFilters {
  modalidade: number;
  codigo_item_material?: number;
  codigo_item_servico?: number;
  uasg?: number;
  numero_aviso?: number;
  cnpj_fornecedor?: string;
  cpfVencedor?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export async function searchItensLicitacaoLegado(
  filters: ItemLicitacaoLegadoFilters,
): Promise<ComprasPagedResponse<ItemLicitacaoLegado>> {
  return fetchApi<ComprasPagedResponse<ItemLicitacaoLegado>>(
    "/modulo-legado/2_consultarItemLicitacao",
    { ...filters, pagina: filters.pagina ?? 1, tamanhoPagina: filters.tamanhoPagina ?? 100 },
  );
}

export interface ItensPregoesLegadoFilters {
  dt_hom_inicial: string;
  dt_hom_final: string;
  co_uasg?: number;
  decreto_7174?: string;
  fornecedor_vencedor?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export async function searchItensPregoesLegado(
  filters: ItensPregoesLegadoFilters,
): Promise<ComprasPagedResponse<ItemLicitacaoLegado>> {
  return fetchApi<ComprasPagedResponse<ItemLicitacaoLegado>>(
    "/modulo-legado/4_consultarItensPregoes",
    { ...filters, pagina: filters.pagina ?? 1, tamanhoPagina: filters.tamanhoPagina ?? 100 },
  );
}

// Expor breaker para testes
export const _internal = { breaker };
