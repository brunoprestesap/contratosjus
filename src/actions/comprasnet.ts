"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireFiscal, requireAuth } from "@/lib/auth-guard";
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
import type { ComprasnetContrato, ComprasnetResponsavel } from "@/types/comprasnet";
import type { ActionResponse } from "@/types";
import { parseVal, safeDateOrNull, safeDateOrFallback } from "@/lib/comprasnet-utils";

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


// ── Consulta ──────────────────────────────────────

export interface ComprasnetContratoComStatus extends ComprasnetContrato {
  jaImportado: boolean;
}

export async function consultarContratosComprasnet(
  codigoUg: string,
  incluirInativos: boolean = false
): Promise<ActionResponse<ComprasnetContratoComStatus[]>> {
  try {
    await requireAuth();

    if (!codigoUg || !codigoUg.trim()) {
      return { success: false, error: "Código da UG inválido" };
    }

    let contratos: ComprasnetContrato[] = [];

    try {
      contratos = await getContratosByUg(codigoUg);
    } catch {
      return {
        success: false,
        error: "Não foi possível consultar a API do Comprasnet. Verifique o código da UG ou tente novamente mais tarde.",
      };
    }

    if (incluirInativos) {
      try {
        const inativos = await getContratosInativosByUg(codigoUg);
        contratos = [...contratos, ...inativos];
      } catch {
        // Inativos são opcionais
      }
    }

    const numerosContratos = contratos.map((c) => c.numero);
    const existentes = await prisma.contract.findMany({
      where: { contractNumber: { in: numerosContratos } },
      select: { contractNumber: true },
    });
    const numerosExistentes = new Set(existentes.map((e) => e.contractNumber));

    const resultado: ComprasnetContratoComStatus[] = contratos.map((c) => ({
      ...c,
      jaImportado: numerosExistentes.has(c.numero),
    }));

    return { success: true, data: resultado };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao consultar contratos do Comprasnet" };
  }
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

// ── Importação ────────────────────────────────────

export async function importarContratoComprasnet(
  contrato: ComprasnetContrato
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireFiscal();

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

    const responsaveisData = responsaveis.length > 0
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
        legalRegime: mapLegalRegime(contrato.amparo_legal || "") as "LEI_14133_2021" | "LEI_8666_1993",
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
          create: itens.map((i) => ({
            comprasnetId: i.id,
            tipoId: i.tipo_id,
            tipoMaterial: i.tipo_material,
            grupoId: i.grupo_id,
            descricao: i.catmatseritem_id,
            descricaoComplementar: i.descricao_complementar,
            quantidade: parseVal(i.quantidade),
            valorUnitario: parseVal(i.valorunitario),
            valorTotal: parseVal(i.valortotal),
            numeroItemCompra: i.numero_item_compra,
          })),
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
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    console.error(`[Comprasnet] Erro ao importar contrato ${contrato.numero}:`, error);
    return { success: false, error: `Erro ao importar contrato ${contrato.numero}` };
  }
}

export async function importarMultiplosContratos(
  contratos: ComprasnetContrato[]
): Promise<ActionResponse<{ importados: number; erros: number }>> {
  try {
    await requireFiscal();

    let importados = 0;
    let erros = 0;

    for (const contrato of contratos) {
      const result = await importarContratoComprasnet(contrato);
      if (result.success) {
        importados++;
      } else {
        erros++;
      }
    }

    revalidatePath("/contratos");
    return { success: true, data: { importados, erros } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao importar contratos" };
  }
}
