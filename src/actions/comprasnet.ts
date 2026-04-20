"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireFiscal, requireAuth } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import {
  getContratosByUg,
  getContratosInativosByUg,
  getResponsaveisByContrato,
  getHistoricoByContrato,
  getEmpenhosByContrato,
  getCronogramaByContrato,
  getFaturasByContrato,
  getGarantiasByContrato,
  getItensByContrato,
  getPrepostosByContrato,
  getOcorrenciasByContrato,
  getTerceirizadosByContrato,
  getArquivosByContrato,
  getPublicacoesByContrato,
} from "@/lib/comprasnet";
import type {
  ComprasnetContrato,
  ComprasnetContratoDTO,
  ComprasnetResponsavel,
} from "@/types/comprasnet";
import type { ActionResponse } from "@/types";
import {
  parseBrazilianNumber,
  parseVal,
  safeDateOrNull,
  safeDateOrFallback,
} from "@/lib/comprasnet-utils";

const CODIGO_UG_REGEX = /^\d{6}$/;

function isValidCodigoUg(codigoUg: string | null | undefined): codigoUg is string {
  return typeof codigoUg === "string" && CODIGO_UG_REGEX.test(codigoUg);
}

const COMPRASNET_MODALIDADE_MAP: Record<string, string> = {
  "01": "CONVITE",
  "02": "TOMADA_PRECOS",
  "03": "CONCORRENCIA",
  "04": "CONCORRENCIA",
  "05": "PREGAO_ELETRONICO",
  "06": "DISPENSA",
  "07": "INEXIGIBILIDADE",
  "08": "DISPENSA",
  "09": "PREGAO_PRESENCIAL",
  "10": "PREGAO_ELETRONICO",
  "11": "DIALOGO_COMPETITIVO",
  "22": "PREGAO_ELETRONICO",
};

function mapModalidade(codigoModalidade: string): string {
  return COMPRASNET_MODALIDADE_MAP[codigoModalidade] ?? "OUTROS";
}

function mapLegalRegime(amparoLegal: string): string {
  if (amparoLegal.includes("14.133") || amparoLegal.includes("14133")) {
    return "LEI_14133_2021";
  }
  return "LEI_8666_1993";
}

function extractNomeResponsavel(usuario: string): string {
  const parts = usuario.split(" - ");
  return parts.length > 1 ? parts.slice(1).join(" - ").trim() : usuario.trim();
}

function mapResponsaveis(responsaveis: ComprasnetResponsavel[]): {
  fiscalHolder: string;
  fiscalSubstitute: string | null;
  contractManager: string | null;
} {
  const ativos = responsaveis.filter((r) => r.situacao === "Ativo");

  let fiscalHolder = "A definir";
  let fiscalSubstitute: string | null = null;
  let contractManager: string | null = null;

  for (const r of ativos) {
    const nome = extractNomeResponsavel(r.usuario);
    const funcao = r.funcao_id.toLowerCase();

    if (funcao.includes("gestor") && !funcao.includes("substitut")) {
      contractManager = contractManager ?? nome;
    } else if (funcao.includes("gestor") && funcao.includes("substitut")) {
      // Gestor substituto — sem campo dedicado, ignorar
    } else if (funcao.includes("fiscal") && funcao.includes("substitut")) {
      fiscalSubstitute = fiscalSubstitute ?? nome;
    } else if (funcao.includes("fiscal")) {
      if (fiscalHolder === "A definir") {
        fiscalHolder = nome;
      }
    }
  }

  return { fiscalHolder, fiscalSubstitute, contractManager };
}

// ── Fetch seguro (não bloqueia importação) ────────

async function fetchSafe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    const result = await fn();
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

// ── Consulta ──────────────────────────────────────

export interface ComprasnetContratoComStatus extends ComprasnetContratoDTO {
  jaImportado: boolean;
}

export type ComprasnetSortField =
  | "numero"
  | "fornecedor"
  | "objeto"
  | "vigencia"
  | "valor"
  | "situacao";
export type ComprasnetSortDir = "asc" | "desc";

export interface ComprasnetQueryParams {
  page?: number;
  perPage?: number;
  sortField?: ComprasnetSortField;
  sortDir?: ComprasnetSortDir;
}

export interface ComprasnetContratosPaginados {
  data: ComprasnetContratoComStatus[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;

function toDTO(c: ComprasnetContrato): ComprasnetContratoDTO {
  return {
    id: c.id,
    numero: c.numero,
    objeto: c.objeto,
    situacao: c.situacao,
    vigencia_inicio: c.vigencia_inicio,
    vigencia_fim: c.vigencia_fim,
    valor_global: c.valor_global,
    fornecedor: {
      nome: c.fornecedor?.nome ?? "",
      cnpj_cpf_idgener: c.fornecedor?.cnpj_cpf_idgener ?? "",
    },
  };
}

async function fetchContratosUg(codigoUg: string, incluirInativos: boolean) {
  const ativos = await getContratosByUg(codigoUg);
  if (!incluirInativos) return ativos;
  const inativos = await fetchSafe(() => getContratosInativosByUg(codigoUg));
  return [...ativos, ...inativos];
}

function sortContratos(
  list: ComprasnetContratoComStatus[],
  field: ComprasnetSortField | undefined,
  dir: ComprasnetSortDir | undefined,
): ComprasnetContratoComStatus[] {
  if (!field || !dir) return list;
  const mul = dir === "asc" ? 1 : -1;
  const key = (c: ComprasnetContratoComStatus): string | number => {
    switch (field) {
      case "numero":
        return c.numero ?? "";
      case "fornecedor":
        return c.fornecedor?.nome ?? "";
      case "objeto":
        return c.objeto ?? "";
      case "vigencia": {
        if (!c.vigencia_inicio) return 0;
        const t = new Date(c.vigencia_inicio).getTime();
        return Number.isNaN(t) ? 0 : t;
      }
      case "valor":
        return parseBrazilianNumber(c.valor_global);
      case "situacao":
        return c.situacao ?? "";
    }
  };
  return [...list].sort((a, b) => {
    const va = key(a);
    const vb = key(b);
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * mul;
    return String(va).localeCompare(String(vb), "pt-BR", { numeric: true }) * mul;
  });
}

export async function consultarContratosComprasnet(
  codigoUg: string,
  incluirInativos: boolean = false,
  params: ComprasnetQueryParams = {},
): Promise<ActionResponse<ComprasnetContratosPaginados>> {
  try {
    await requireAuth();

    if (!isValidCodigoUg(codigoUg)) {
      return { success: false, error: "Código da UG inválido (6 dígitos)" };
    }

    let contratos: ComprasnetContrato[] = [];

    try {
      contratos = await fetchContratosUg(codigoUg, incluirInativos);
    } catch {
      return {
        success: false,
        error:
          "Não foi possível consultar a API do Comprasnet. Verifique o código da UG ou tente novamente mais tarde.",
      };
    }

    const numerosContratos = contratos.map((c) => c.numero);
    const existentes = await prisma.contract.findMany({
      where: { contractNumber: { in: numerosContratos } },
      select: { contractNumber: true },
    });
    const numerosExistentes = new Set(existentes.map((e) => e.contractNumber));

    const todos: ComprasnetContratoComStatus[] = contratos.map((c) => ({
      ...toDTO(c),
      jaImportado: numerosExistentes.has(c.numero),
    }));

    const sorted = sortContratos(todos, params.sortField, params.sortDir);

    const total = sorted.length;
    const perPage = Math.min(
      MAX_PER_PAGE,
      Math.max(5, Math.floor(params.perPage ?? DEFAULT_PER_PAGE)),
    );
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const page = Math.min(totalPages, Math.max(1, Math.floor(params.page ?? 1)));
    const start = (page - 1) * perPage;
    const data = sorted.slice(start, start + perPage);

    return { success: true, data: { data, page, perPage, total, totalPages } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao consultar contratos do Comprasnet" };
  }
}

// ── Importação ────────────────────────────────────

async function persistContratoComprasnet(
  contrato: ComprasnetContrato,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const existente = await prisma.contract.findUnique({
      where: { contractNumber: contrato.numero },
    });
    if (existente) {
      return { success: false, error: "Contrato já cadastrado no sistema" };
    }

    const globalValue = parseVal(contrato.valor_global);
    const valorParcela = parseVal(contrato.valor_parcela);

    // Buscar todos os sub-recursos em paralelo
    const [
      responsaveis,
      historicos,
      empenhos,
      cronogramas,
      faturas,
      garantias,
      itens,
      prepostos,
      ocorrencias,
      terceirizados,
      arquivos,
      publicacoes,
    ] = await Promise.all([
      fetchSafe(() => getResponsaveisByContrato(contrato.id)),
      fetchSafe(() => getHistoricoByContrato(contrato.id)),
      fetchSafe(() => getEmpenhosByContrato(contrato.id)),
      fetchSafe(() => getCronogramaByContrato(contrato.id)),
      fetchSafe(() => getFaturasByContrato(contrato.id)),
      fetchSafe(() => getGarantiasByContrato(contrato.id)),
      fetchSafe(() => getItensByContrato(contrato.id)),
      fetchSafe(() => getPrepostosByContrato(contrato.id)),
      fetchSafe(() => getOcorrenciasByContrato(contrato.id)),
      fetchSafe(() => getTerceirizadosByContrato(contrato.id)),
      fetchSafe(() => getArquivosByContrato(contrato.id)),
      fetchSafe(() => getPublicacoesByContrato(contrato.id)),
    ]);

    const responsaveisData =
      responsaveis.length > 0
        ? mapResponsaveis(responsaveis)
        : { fiscalHolder: "A definir", fiscalSubstitute: null, contractManager: null };

    // Criar contrato + todos os sub-recursos numa transação
    const created = await prisma.contract.create({
      data: {
        contractNumber: contrato.numero,
        processNumber: contrato.processo || "Não informado",
        object: contrato.objeto || "Importado do Comprasnet",
        supplier: contrato.fornecedor?.nome || "Não informado",
        supplierCnpj: (contrato.fornecedor?.cnpj_cpf_idgener || "").replace(/\D/g, ""),
        legalRegime: mapLegalRegime(contrato.amparo_legal || "") as
          | "LEI_14133_2021"
          | "LEI_8666_1993",
        biddingModality: mapModalidade(contrato.codigo_modalidade) as
          | "PREGAO_ELETRONICO"
          | "PREGAO_PRESENCIAL"
          | "DISPENSA"
          | "INEXIGIBILIDADE"
          | "CONCORRENCIA"
          | "TOMADA_PRECOS"
          | "CONVITE"
          | "DIALOGO_COMPETITIVO"
          | "OUTROS",
        signatureDate: safeDateOrFallback(contrato.data_assinatura),
        startDate: safeDateOrFallback(contrato.vigencia_inicio),
        endDate: safeDateOrFallback(contrato.vigencia_fim),
        canExtend: contrato.prorrogavel === "Sim",
        globalValue,
        paymentType: contrato.num_parcelas > 1 ? "FIXED" : "VARIABLE",
        estimatedMonthlyValue: contrato.num_parcelas > 1 ? valorParcela : null,
        paymentPeriodicity: "MONTHLY",
        budgetProgram: null,
        expenseNature: null,
        fiscalHolder: responsaveisData.fiscalHolder,
        fiscalSubstitute: responsaveisData.fiscalSubstitute,
        contractManager: responsaveisData.contractManager,
        status: contrato.situacao === "Ativo" ? "ACTIVE" : "EXPIRED",
        comprasnetId: contrato.id,

        // ── Histórico ──
        historicos: {
          create: historicos.map((h) => ({
            comprasnetId: h.id,
            numero: h.numero,
            tipo: h.tipo,
            categoria: h.categoria,
            observacao: h.observacao,
            processo: h.processo,
            objeto: h.objeto,
            modalidade: h.modalidade,
            fornecedorNome: h.fornecedor?.nome ?? null,
            fornecedorCnpj: h.fornecedor?.cnpj_cpf_idgener?.replace(/\D/g, "") ?? null,
            dataAssinatura: safeDateOrNull(h.data_assinatura),
            dataPublicacao: safeDateOrNull(h.data_publicacao),
            vigenciaInicio: safeDateOrNull(h.vigencia_inicio),
            vigenciaFim: safeDateOrNull(h.vigencia_fim),
            valorInicial: parseVal(h.valor_inicial),
            valorGlobal: parseVal(h.valor_global),
            numParcelas: h.num_parcelas,
            valorParcela: parseVal(h.valor_parcela),
            novoValorGlobal: parseVal(h.novo_valor_global),
            novoNumParcelas: h.novo_num_parcelas,
            novoValorParcela: parseVal(h.novo_valor_parcela),
            situacaoContrato: h.situacao_contrato,
            criadoEm: safeDateOrNull(h.criado_em),
            alteradoEm: safeDateOrNull(h.alterado_em),
          })),
        },

        // ── Empenhos ──
        commitments: {
          create: empenhos
            .filter((e) => e.numero && e.data_emissao)
            .map((e) => ({
              comprasnetId: e.id,
              commitmentNumber: e.numero,
              commitmentDate: safeDateOrFallback(e.data_emissao),
              value: parseVal(e.empenhado),
              type: "INITIAL" as const,
              notes: [
                e.credor,
                e.naturezadespesa,
                e.fonte_recurso ? `Fonte: ${e.fonte_recurso}` : null,
                e.programa_trabalho ? `PT: ${e.programa_trabalho}` : null,
              ]
                .filter(Boolean)
                .join(" | "),
            })),
        },

        // ── Cronograma ──
        cronogramas: {
          create: cronogramas.map((c) => ({
            comprasnetId: c.id,
            tipo: c.tipo,
            numero: c.numero,
            mesRef: typeof c.mesref === "string" ? parseInt(c.mesref, 10) : c.mesref,
            anoRef: typeof c.anoref === "string" ? parseInt(c.anoref, 10) : c.anoref,
            vencimento: safeDateOrNull(c.vencimento),
            retroativo: c.retroativo,
            valor: parseVal(c.valor),
            observacao: c.observacao,
          })),
        },

        // ── Garantias ──
        garantias: {
          create: garantias.map((g) => ({
            comprasnetId: g.id,
            tipo: g.tipo,
            valor: parseVal(g.valor),
            vencimento: safeDateOrNull(g.vencimento),
          })),
        },

        // ── Itens ──
        itens: {
          create: itens.map((i) => {
            const isService = i.tipo_material === "S";
            const detailed =
              i.descricao_complementar?.trim() || "Importado do Comprasnet — revisar especificação";
            const description = (i.descricao_complementar?.trim() || detailed).slice(0, 200);
            const quantity = parseVal(i.quantidade);
            const unitValue = parseVal(i.valorunitario);
            const totalValue = parseVal(i.valortotal);
            return {
              comprasnetId: i.id,
              itemNumber: i.numero_item_compra?.trim() || `CMPR-${i.id}`,
              itemType: isService ? "SERVICE" : "MATERIAL",
              catalogType: isService ? "CATSER" : "CATMAT",
              catalogCode: i.catmatseritem_id?.trim() || null,
              description,
              detailedSpecification: detailed,
              unitOfMeasure: "UN" as const,
              quantity,
              unitValue,
              totalValue,
              needsReview: true,
            };
          }),
        },

        // ── Prepostos ──
        prepostos: {
          create: prepostos.map((p) => ({
            comprasnetId: p.id,
            usuario: p.usuario,
            email: p.email,
            telefonefixo: p.telefonefixo,
            celular: p.celular,
            docFormalizacao: p.doc_formalizacao,
            informacaoComplementar: p.informacao_complementar,
            dataInicio: safeDateOrNull(p.data_inicio),
            dataFim: safeDateOrNull(p.data_fim),
            situacao: p.situacao,
          })),
        },

        // ── Ocorrências ──
        ocorrencias: {
          create: ocorrencias.map((o) => ({
            comprasnetId: o.id,
            tipo: o.tipo,
            descricao: o.descricao,
            data: safeDateOrNull(o.data),
            situacao: o.situacao,
          })),
        },

        // ── Terceirizados ──
        terceirizados: {
          create: terceirizados.map((t) => ({
            comprasnetId: t.id,
            usuario: t.usuario,
            funcao: t.funcao_id,
            jornada: t.jornada,
            unidade: t.unidade,
            salario: parseVal(t.salario),
            custo: parseVal(t.custo),
            escolaridade: t.escolaridade_id,
            auxTransporte: parseVal(t.aux_transporte),
            valeAlimentacao: parseVal(t.vale_alimentacao),
            dataInicio: safeDateOrNull(t.data_inicio),
            dataFim: safeDateOrNull(t.data_fim),
            situacao: t.situacao,
          })),
        },

        // ── Arquivos ──
        arquivos: {
          create: arquivos.map((a) => ({
            comprasnetId: a.id,
            tipo: a.tipo,
            descricao: a.descricao,
            pathArquivo: a.path_arquivo,
            origem: a.origem,
            sequencialDocumento: a.sequencial_documento,
          })),
        },

        // ── Faturas ──
        faturas: {
          create: faturas.map((f) => ({
            comprasnetId: f.id,
            tipoListaFaturaId: f.tipolistafatura_id,
            numero: f.numero,
            emissao: safeDateOrNull(f.emissao),
            vencimento: safeDateOrNull(f.vencimento),
            valor: parseVal(f.valor),
            juros: parseVal(f.juros),
            multa: parseVal(f.multa),
            glosa: parseVal(f.glosa),
            valorLiquido: parseVal(f.valorliquido),
            processo: f.processo,
            ateste: f.ateste,
            situacao: f.situacao,
            mesRef: typeof f.mesref === "string" ? parseInt(f.mesref, 10) : f.mesref,
            anoRef: typeof f.anoref === "string" ? parseInt(f.anoref, 10) : f.anoref,
          })),
        },

        // ── Publicações ──
        publicacoes: {
          create: publicacoes.map((p) => ({
            comprasnetId: p.id,
            dataPublicacao: safeDateOrNull(p.data_publicacao),
            status: p.status,
            textoDou: p.texto_dou,
            linkPublicacao: p.link_publicacao,
          })),
        },
      },
    });

    revalidatePath("/contratos");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    logger.error(
      { err: error, action: "comprasnet.persistContrato", numero: contrato.numero },
      "Erro ao importar contrato",
    );
    return { success: false, error: `Erro ao importar contrato ${contrato.numero}` };
  }
}

export async function importarContratoComprasnet(
  codigoUg: string,
  contratoId: number,
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireFiscal();

    if (!isValidCodigoUg(codigoUg) || !Number.isInteger(contratoId) || contratoId <= 0) {
      return { success: false, error: "Parâmetros inválidos" };
    }

    const contratos = await fetchContratosUg(codigoUg, true);
    const contrato = contratos.find((c) => c.id === contratoId);
    if (!contrato) {
      return { success: false, error: "Contrato não encontrado na UG informada" };
    }

    return await persistContratoComprasnet(contrato);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    logger.error(
      { err: error, action: "comprasnet.importContrato", codigoUg, contratoId },
      "Erro ao importar contrato",
    );
    return { success: false, error: "Erro ao importar contrato" };
  }
}

const IMPORT_CONCURRENCY = 3;

export async function importarMultiplosContratos(
  codigoUg: string,
  contratoIds: number[],
): Promise<ActionResponse<{ importados: number; erros: number }>> {
  try {
    await requireFiscal();

    if (!isValidCodigoUg(codigoUg) || !Array.isArray(contratoIds)) {
      return { success: false, error: "Parâmetros inválidos" };
    }

    const validIds = contratoIds.filter((n): n is number => Number.isInteger(n) && n > 0);
    if (validIds.length === 0) {
      return { success: false, error: "Nenhum id válido informado" };
    }

    const contratos = await fetchContratosUg(codigoUg, true);
    const porId = new Map(contratos.map((c) => [c.id, c]));

    let importados = 0;
    let erros = 0;

    // Processa em lotes com concorrência limitada para não sobrecarregar a API pública.
    for (let i = 0; i < validIds.length; i += IMPORT_CONCURRENCY) {
      const batch = validIds.slice(i, i + IMPORT_CONCURRENCY);
      const results = await Promise.all(
        batch.map((id) => {
          const contrato = porId.get(id);
          if (!contrato) return Promise.resolve({ success: false } as const);
          return persistContratoComprasnet(contrato);
        }),
      );
      for (const r of results) {
        if (r.success) importados++;
        else erros++;
      }
    }

    revalidatePath("/contratos");
    return { success: true, data: { importados, erros } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    logger.error(
      { err: error, action: "comprasnet.importMultiplos", codigoUg },
      "Erro ao importar contratos em lote",
    );
    return { success: false, error: "Erro ao importar contratos" };
  }
}
