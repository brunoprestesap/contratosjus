import { CircuitBreaker } from "@/lib/circuit-breaker";
import { withRetry } from "@/lib/retry";
import type {
  ComprasnetContrato,
  ComprasnetEmpenho,
  ComprasnetFatura,
  ComprasnetResponsavel,
} from "@/types/comprasnet";

const BASE_URL = "https://contratos.comprasnet.gov.br";
const REQUEST_TIMEOUT_MS = 15000;

// ── Errors ───────────────────────────────────────────

export class ComprasnetAuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ComprasnetAuthError";
  }
}

// ── Token management ─────────────────────────────────

interface TokenData {
  token: string;
  expiresAt: number;
}

let cachedToken: TokenData | null = null;

function getCredentials(): { cpf: string; password: string } {
  const cpf = process.env.COMPRASNET_CPF;
  const password = process.env.COMPRASNET_PASSWORD;
  if (!cpf || !password) {
    throw new ComprasnetAuthError(
      0,
      "Credenciais do Comprasnet não configuradas (COMPRASNET_CPF / COMPRASNET_PASSWORD)",
    );
  }
  return { cpf, password };
}

async function authenticate(): Promise<string> {
  // Reusar token se ainda válido (margem de 60s)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const { cpf, password } = getCredentials();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ cpf, password }),
      cache: "no-store",
    });

    if (!response.ok) {
      cachedToken = null;
      throw new ComprasnetAuthError(
        response.status,
        response.status === 401
          ? "Credenciais do Comprasnet inválidas"
          : `Erro ao autenticar no Comprasnet: ${response.status}`,
      );
    }

    const body = (await response.json()) as {
      token?: string;
      access_token?: string;
      expires_in?: number;
    };
    const token = body.token ?? body.access_token ?? "";
    if (!token) {
      throw new ComprasnetAuthError(0, "Token não retornado pela API");
    }

    // JWT do Comprasnet expira em ~1h; usar expires_in se disponível
    const FALLBACK_TOKEN_TTL_SECONDS = 3000; // 50 min
    const ttlMs = (body.expires_in ?? FALLBACK_TOKEN_TTL_SECONDS) * 1000;
    cachedToken = { token, expiresAt: Date.now() + ttlMs };

    return token;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Invalida o token em cache (útil após 401 em chamada autenticada).
 */
export function invalidateToken(): void {
  cachedToken = null;
}

// ── Circuit breaker ──────────────────────────────────

const breaker = new CircuitBreaker({
  threshold: 3,
  windowMs: 60_000,
  openMs: 120_000,
});

// ── Authenticated fetch ──────────────────────────────

async function fetchAuthApi<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: {
    params?: Record<string, unknown>;
    body?: unknown;
  } = {},
): Promise<T> {
  breaker.assertClosed();

  return withRetry<T>(
    async () => {
      // Re-authenticate se for retry após 401
      const token = await authenticate();

      const query = options.params ? buildQuery(options.params) : "";
      const url = `${BASE_URL}${path}${query}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };
        const init: RequestInit = {
          method,
          signal: controller.signal,
          headers,
          cache: "no-store",
        };

        if (options.body && method !== "GET") {
          headers["Content-Type"] = "application/json";
          init.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, init);

        if (response.status === 401) {
          invalidateToken();
          throw new ComprasnetAuthError(401, "Token expirado ou inválido");
        }

        if (!response.ok) {
          const err = new ComprasnetAuthError(
            response.status,
            `Erro na API Comprasnet v1: ${response.status}`,
          );
          if (response.status >= 500) breaker.recordFailure();
          throw err;
        }

        const body = (await response.json()) as T;
        breaker.recordSuccess();
        return body;
      } catch (error) {
        if (!(error instanceof ComprasnetAuthError)) {
          breaker.recordFailure();
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
    {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 4000,
      shouldRetry: (error, attempt) => {
        if (error instanceof ComprasnetAuthError && error.status === 401 && attempt <= 1) {
          return true; // retry uma vez após re-auth
        }
        const status = (error as { status?: number }).status;
        return status === undefined || status === 0 || status >= 500;
      },
    },
  );
}

function buildQuery(params: Record<string, unknown>): string {
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    entries.push([key, String(value)]);
  }
  return entries.length ? "?" + new URLSearchParams(entries).toString() : "";
}

// ── Contratos (consultas autenticadas) ───────────────

export async function getContratosAlterados(
  dtAlteracaoMin: string,
  dtAlteracaoMax: string,
): Promise<ComprasnetContrato[]> {
  return fetchAuthApi<ComprasnetContrato[]>("GET", "/api/v1/contrato", {
    params: { dt_alteracao_min: dtAlteracaoMin, dt_alteracao_max: dtAlteracaoMax },
  });
}

export async function getContratosByOrgao(orgao: string): Promise<ComprasnetContrato[]> {
  return fetchAuthApi<ComprasnetContrato[]>("GET", `/api/v1/contrato/orgao/${orgao}`);
}

export async function getContratosInativosByOrgao(orgao: string): Promise<ComprasnetContrato[]> {
  return fetchAuthApi<ComprasnetContrato[]>("GET", `/api/v1/contrato/inativo/orgao/${orgao}`);
}

export async function getContratosByUgAuth(unidadeCodigo: string): Promise<ComprasnetContrato[]> {
  return fetchAuthApi<ComprasnetContrato[]>("GET", `/api/v1/contrato/ug/${unidadeCodigo}`);
}

// ── Empenhos ─────────────────────────────────────────

export async function getEmpenhosAlterados(
  dtAlteracaoMin: string,
  dtAlteracaoMax: string,
): Promise<ComprasnetEmpenho[]> {
  return fetchAuthApi<ComprasnetEmpenho[]>("GET", "/api/v1/empenho", {
    params: { dt_alteracao_min: dtAlteracaoMin, dt_alteracao_max: dtAlteracaoMax },
  });
}

export async function getEmpenhosByUg(unidade: string): Promise<ComprasnetEmpenho[]> {
  return fetchAuthApi<ComprasnetEmpenho[]>("GET", `/api/v1/empenho/ug/${unidade}`);
}

export async function getEmpenhosByAno(ano: number): Promise<ComprasnetEmpenho[]> {
  return fetchAuthApi<ComprasnetEmpenho[]>("GET", `/api/v1/empenho/ano/${ano}`);
}

export async function getEmpenhosByAnoUg(
  ano: number,
  unidade: string,
): Promise<ComprasnetEmpenho[]> {
  return fetchAuthApi<ComprasnetEmpenho[]>("GET", `/api/v1/empenho/ano/${ano}/ug/${unidade}`);
}

export async function getEmpenhoById(empenhoId: number): Promise<ComprasnetEmpenho> {
  return fetchAuthApi<ComprasnetEmpenho>("GET", `/api/v1/contrato/empenho/consultar/${empenhoId}`);
}

export async function getRestosAPagar(
  dtAlteracaoMin: string,
  dtAlteracaoMax: string,
): Promise<ComprasnetEmpenho[]> {
  return fetchAuthApi<ComprasnetEmpenho[]>("GET", "/api/v1/empenho/rp", {
    params: { dt_alteracao_min: dtAlteracaoMin, dt_alteracao_max: dtAlteracaoMax },
  });
}

// ── Faturas ──────────────────────────────────────────

export async function getFaturasAlteradas(
  dtAlteracaoMin: string,
  dtAlteracaoMax: string,
): Promise<ComprasnetFatura[]> {
  return fetchAuthApi<ComprasnetFatura[]>("GET", "/api/v1/contrato/faturas", {
    params: { dt_alteracao_min: dtAlteracaoMin, dt_alteracao_max: dtAlteracaoMax },
  });
}

// ── Responsáveis (v2) ────────────────────────────────

export async function getResponsaveisV2(contratoId: number): Promise<ComprasnetResponsavel[]> {
  return fetchAuthApi<ComprasnetResponsavel[]>(
    "GET",
    `/api/v2/contrato/${contratoId}/responsaveis`,
  );
}

// ── Fornecedores ─────────────────────────────────────

export interface ComprasnetFornecedorContratos {
  contratos_ativos: ComprasnetContrato[];
  contratos_inativos: ComprasnetContrato[];
}

export async function getContratosByFornecedor(
  cnpj?: string,
  cpf?: string,
): Promise<ComprasnetFornecedorContratos> {
  const params: Record<string, unknown> = {};
  if (cnpj) params.cnpj = cnpj;
  if (cpf) params.cpf = cpf;
  return fetchAuthApi<ComprasnetFornecedorContratos>("GET", "/api/v1/fornecedor/contratos", {
    params,
  });
}

// ── Fiscalização ─────────────────────────────────────

export interface ComprasnetExecucao {
  id: number;
  contrato_id: number;
  [key: string]: unknown;
}

export async function getExecucoesByContrato(contratoId: number): Promise<ComprasnetExecucao[]> {
  return fetchAuthApi<ComprasnetExecucao[]>("GET", `/api/v1/execucoes/contratos/${contratoId}`);
}

// ── Usuários Comprasnet ──────────────────────────────

export interface ComprasnetUsuario {
  cpf: string;
  nome: string;
  [key: string]: unknown;
}

export async function getUsuarioByCpf(cpf: string): Promise<ComprasnetUsuario> {
  return fetchAuthApi<ComprasnetUsuario>("GET", `/api/v1/usuario/cpf/${cpf}`);
}

export async function getUsuariosByUg(unidadeCodigo: string): Promise<ComprasnetUsuario[]> {
  return fetchAuthApi<ComprasnetUsuario[]>("GET", `/api/v1/usuario/ug/${unidadeCodigo}`);
}

// ── Apropriação ──────────────────────────────────────

export interface ApropriacaoRequest {
  nonce: string;
  id_inst_cobranca: number[];
  cpf_usuario: string;
  tipo_dh: string;
  cod_ug_emitente: number;
  data_emissao_contabil: string;
  data_vencimento: string;
  taxa_cambio: number;
  processo: string;
  data_ateste: string;
  observacao?: string;
  informacoes_adicionais: string;
  sf_pco: unknown[];
  data_pagamento: string;
  sf_centro_custo: unknown[];
  favorecido_ob: string;
  deducao: unknown[];
  predoc_ob: unknown[];
}

export interface ApropriacaoResponse {
  id_apropriacao_inst_cobranca: number;
  status: string;
  mensagem: string;
  situacao: string;
}

export async function apropriarInstrumentoCobranca(
  data: ApropriacaoRequest,
): Promise<ApropriacaoResponse> {
  return fetchAuthApi<ApropriacaoResponse>(
    "POST",
    "/api/v1/contrato/instrumento_cobranca/apropriar",
    { body: data },
  );
}

export async function consultarApropriacoes(contratoId: number): Promise<ApropriacaoResponse[]> {
  return fetchAuthApi<ApropriacaoResponse[]>(
    "GET",
    `/api/v1/contrato/apropriacao/consultar/${contratoId}`,
  );
}

export async function cancelarApropriacao(
  nonce: string,
  idApropriacao: number,
  cpfUsuario: string,
): Promise<ApropriacaoResponse> {
  return fetchAuthApi<ApropriacaoResponse>("PUT", "/api/v1/contrato/apropriacao/cancelar", {
    body: { nonce, id_apropriacao_inst_cobranca: idApropriacao, cpf_usuario: cpfUsuario },
  });
}

export async function excluirApropriacao(
  nonce: string,
  idApropriacao: number,
  cpfUsuario: string,
): Promise<ApropriacaoResponse> {
  return fetchAuthApi<ApropriacaoResponse>("DELETE", "/api/v1/contrato/apropriacao/excluir", {
    body: { nonce, id_apropriacao_inst_cobranca: idApropriacao, cpf_usuario: cpfUsuario },
  });
}

// ── Instrumento de Cobrança ──────────────────────────

export async function consultarInstrumentosCobranca(
  params: Record<string, unknown> = {},
): Promise<unknown> {
  return fetchAuthApi("GET", "/api/v1/inst_cobranca/consultar", { params });
}

// ── Ordem Bancária ───────────────────────────────────

export async function getOrdemBancariaByApropriacao(idApropriacao: number): Promise<unknown> {
  return fetchAuthApi("GET", `/api/v1/ordembancaria/consultar/${idApropriacao}`);
}

export async function getOrdemBancariaByInstrumentoCobranca(
  idInstrumentoCobranca: number,
): Promise<unknown> {
  return fetchAuthApi(
    "GET",
    `/api/v1/ordembancaria/consultar/instrumento_cobranca/${idInstrumentoCobranca}`,
  );
}

// Expor para testes
export const _internal = { breaker, invalidateToken, authenticate };
