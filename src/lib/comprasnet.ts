import type {
  ComprasnetContrato,
  ComprasnetResponsavel,
  ComprasnetEmpenho,
  ComprasnetCronograma,
  ComprasnetHistorico,
  ComprasnetFatura,
  ComprasnetGarantia,
  ComprasnetItem,
  ComprasnetPreposto,
  ComprasnetOcorrencia,
  ComprasnetTerceirizado,
  ComprasnetArquivo,
  ComprasnetPublicacao,
} from "@/types/comprasnet";

const BASE_URL = "https://contratos.comprasnet.gov.br";
const REQUEST_TIMEOUT_MS = 15000;

class ComprasnetApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ComprasnetApiError";
  }
}

async function fetchApi<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!response.ok) {
      throw new ComprasnetApiError(
        response.status,
        `Erro ao consultar API Comprasnet: ${response.status}`
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Retorna todos os contratos ativos de uma UG (Unidade Gestora).
 * O código da UG deve ser passado como string para preservar zeros à esquerda.
 */
export async function getContratosByUg(
  codigoUg: string
): Promise<ComprasnetContrato[]> {
  return fetchApi<ComprasnetContrato[]>(`/api/contrato/ug/${codigoUg}`);
}

/**
 * Retorna todos os contratos inativos de uma UG.
 */
export async function getContratosInativosByUg(
  codigoUg: string
): Promise<ComprasnetContrato[]> {
  return fetchApi<ComprasnetContrato[]>(
    `/api/contrato/inativo/ug/${codigoUg}`
  );
}

/**
 * Retorna um contrato pelo ID.
 */
export async function getContratoById(
  contratoId: number
): Promise<ComprasnetContrato> {
  return fetchApi<ComprasnetContrato>(
    `/api/contrato/id/${contratoId}`
  );
}

/**
 * Retorna um contrato pela UASG de origem e número.
 */
export async function getContratoByUasgNumero(
  codigoUasg: number,
  numeroContrato: string
): Promise<ComprasnetContrato> {
  return fetchApi<ComprasnetContrato>(
    `/api/contrato/ugorigem/${codigoUasg}/numeroano/${numeroContrato}`
  );
}

/**
 * Retorna responsáveis (fiscais e gestores) de um contrato.
 */
export async function getResponsaveisByContrato(
  contratoId: number
): Promise<ComprasnetResponsavel[]> {
  return fetchApi<ComprasnetResponsavel[]>(
    `/api/contrato/${contratoId}/responsaveis`
  );
}

/**
 * Retorna empenhos vinculados a um contrato.
 */
export async function getEmpenhosByContrato(
  contratoId: number
): Promise<ComprasnetEmpenho[]> {
  return fetchApi<ComprasnetEmpenho[]>(
    `/api/contrato/${contratoId}/empenhos`
  );
}

/**
 * Retorna cronograma de um contrato.
 */
export async function getCronogramaByContrato(
  contratoId: number
): Promise<ComprasnetCronograma[]> {
  return fetchApi<ComprasnetCronograma[]>(
    `/api/contrato/${contratoId}/cronograma`
  );
}

/**
 * Retorna histórico (aditivos) de um contrato.
 */
export async function getHistoricoByContrato(
  contratoId: number
): Promise<ComprasnetHistorico[]> {
  return fetchApi<ComprasnetHistorico[]>(
    `/api/contrato/${contratoId}/historico`
  );
}

/**
 * Retorna faturas de um contrato.
 */
export async function getFaturasByContrato(
  contratoId: number
): Promise<ComprasnetFatura[]> {
  return fetchApi<ComprasnetFatura[]>(
    `/api/contrato/${contratoId}/faturas`
  );
}

/**
 * Retorna garantias de um contrato.
 */
export async function getGarantiasByContrato(
  contratoId: number
): Promise<ComprasnetGarantia[]> {
  return fetchApi<ComprasnetGarantia[]>(
    `/api/contrato/${contratoId}/garantias`
  );
}

/**
 * Retorna itens de um contrato.
 */
export async function getItensByContrato(
  contratoId: number
): Promise<ComprasnetItem[]> {
  return fetchApi<ComprasnetItem[]>(
    `/api/contrato/${contratoId}/itens`
  );
}

/**
 * Retorna prepostos de um contrato.
 */
export async function getPrepostosByContrato(
  contratoId: number
): Promise<ComprasnetPreposto[]> {
  return fetchApi<ComprasnetPreposto[]>(
    `/api/contrato/${contratoId}/prepostos`
  );
}

/**
 * Retorna ocorrências de um contrato.
 */
export async function getOcorrenciasByContrato(
  contratoId: number
): Promise<ComprasnetOcorrencia[]> {
  return fetchApi<ComprasnetOcorrencia[]>(
    `/api/contrato/${contratoId}/ocorrencias`
  );
}

/**
 * Retorna terceirizados de um contrato.
 */
export async function getTerceirizadosByContrato(
  contratoId: number
): Promise<ComprasnetTerceirizado[]> {
  return fetchApi<ComprasnetTerceirizado[]>(
    `/api/contrato/${contratoId}/terceirizados`
  );
}

/**
 * Retorna arquivos de um contrato.
 */
export async function getArquivosByContrato(
  contratoId: number
): Promise<ComprasnetArquivo[]> {
  return fetchApi<ComprasnetArquivo[]>(
    `/api/contrato/${contratoId}/arquivos`
  );
}

/**
 * Retorna publicações de um contrato.
 */
export async function getPublicacoesByContrato(
  contratoId: number
): Promise<ComprasnetPublicacao[]> {
  return fetchApi<ComprasnetPublicacao[]>(
    `/api/contrato/${contratoId}/publicacoes`
  );
}
