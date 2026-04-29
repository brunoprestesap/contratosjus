import { callMaritaca, modelFilter, modelWriter } from "@/lib/ai/client";
import { PROMPT_BY_PURPOSE, promptHash, type PromptPurpose } from "@/lib/ai/prompts";
import {
  listClassesMaterial,
  listDivisoesServico,
  listGruposMaterial,
  listItensMaterialByClasse,
  listItensMaterialByPdm,
  listItensServicoByDivisao,
  listPdmsByClasse,
  listSecoesServico,
  searchItemMaterialByDescricao,
} from "@/lib/compras-dadosabertos";
import {
  extractJson,
  extractResultado,
  tryExtractJson,
} from "@/lib/pesquisa-precos/response-parser";
import { prefilterByKeywords } from "@/lib/text-match";
import type {
  CatalogoClasseMaterial,
  CatalogoDivisaoServico,
  CatalogoGrupoMaterial,
  CatalogoItemMaterial,
  CatalogoItemServico,
  CatalogoPdmMaterial,
  CatalogoSecaoServico,
} from "@/types/compras-dadosabertos";

export interface AIGenerationLog {
  purpose: PromptPurpose;
  model: string;
  systemPromptHash: string;
  userPrompt: string;
  response: string;
  inputTokens: number;
  outputTokens: number;
}

export interface CatmatSuggestion {
  codigo: number;
  descricao: string;
  classe: string | null;
  grupo: string | null;
  confidence: "alta" | "media" | "baixa";
  justificativa: string;
}

export interface CatmatSuggestionResult {
  suggestion: CatmatSuggestion | null;
  candidates: CatalogoItemMaterial[];
  log: AIGenerationLog;
}

/**
 * ⚠ LIMITAÇÃO: o endpoint `/modulo-material/4_consultarItemMaterial?descricaoItem=...`
 * exige match EXATO da descrição (não full-text). Esta função funciona apenas
 * quando o parâmetro `objeto` corresponde exatamente a uma `descricaoItem` do
 * catálogo — caso raro. Para produção, prefira entrada manual do código
 * CATMAT/CATSER (do edital/TR) ou implementar navegação hierárquica:
 * listar grupos → IA escolhe → listar classes → IA escolhe → listar itens.
 * Ver memória `reference_compras_dadosabertos_api.md` (seção "Descobertas empíricas").
 */
export async function suggestCatmatFromObject(
  objeto: string,
  limitCandidates = 15,
): Promise<CatmatSuggestionResult> {
  const search = await searchItemMaterialByDescricao({
    descricaoItem: objeto,
    tamanhoPagina: Math.max(10, limitCandidates),
    statusItem: true,
  });
  const candidates = extractResultado<CatalogoItemMaterial>(search);

  if (candidates.length === 0) {
    const log: AIGenerationLog = {
      purpose: "SUGGEST_CATMAT",
      model: modelFilter(),
      systemPromptHash: promptHash("SUGGEST_CATMAT"),
      userPrompt: JSON.stringify({ objeto, candidates: [] }),
      response: "",
      inputTokens: 0,
      outputTokens: 0,
    };
    return { suggestion: null, candidates, log };
  }

  const userPrompt = JSON.stringify({
    objeto,
    candidatos: candidates.map((c) => ({
      codigoItem: c.codigoItem,
      descricaoItem: c.descricaoItem,
      nomeClasse: c.nomeClasse,
      nomeGrupo: c.nomeGrupo,
    })),
  });

  const result = await callMaritaca({
    model: modelFilter(),
    messages: [
      { role: "system", content: PROMPT_BY_PURPOSE.SUGGEST_CATMAT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    responseFormat: "json_object",
  });

  const suggestion = tryExtractJson<CatmatSuggestion>(result.text, "SUGGEST_CATMAT");

  return {
    suggestion,
    candidates,
    log: {
      purpose: "SUGGEST_CATMAT",
      model: result.model,
      systemPromptHash: promptHash("SUGGEST_CATMAT"),
      userPrompt,
      response: result.text,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  };
}

// ── Ranking hierárquico via IA (Material e Serviço) ────────────

interface RankedChoice {
  codigo: number;
  descricao: string;
  confidence: "alta" | "media" | "baixa";
  motivo?: string;
}

async function rankCandidatos(params: {
  objeto: string;
  nivel: string;
  candidatos: Array<{ codigo: number; descricao: string }>;
}): Promise<{ choices: RankedChoice[]; log: AIGenerationLog }> {
  // Cap para evitar estourar contexto; 250 é seguro para Sabiá-3.1
  const sample = params.candidatos.slice(0, 250);
  const userPrompt = JSON.stringify({
    objeto: params.objeto,
    nivel: params.nivel,
    candidatos: sample,
  });

  // Usa o modelo principal (sabia-3.1) no ranking — etapa crítica para
  // qualidade da sugestão; economia de tokens com filter-model não compensa
  // erro em classificação hierárquica.
  const result = await callMaritaca({
    model: modelWriter(),
    messages: [
      { role: "system", content: PROMPT_BY_PURPOSE.RANK_CATALOGO_LEVEL },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    responseFormat: "json_object",
  });

  // Ranking roda em 3-4 níveis; uma falha de parse em um nível deve
  // propagar como trail quebrado (choices vazio), permitindo que a
  // orquestração ofereça fallback manual sem abortar todo o fluxo.
  const parsed = tryExtractJson<{ escolhas: RankedChoice[] }>(result.text, "RANK_CATALOGO_LEVEL");
  const choices = parsed?.escolhas ?? [];

  return {
    choices,
    log: {
      purpose: "RANK_CATALOGO_LEVEL",
      model: result.model,
      systemPromptHash: promptHash("RANK_CATALOGO_LEVEL"),
      userPrompt,
      response: result.text,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  };
}

export interface HierarchyTrailStep {
  nivel: string;
  codigo: number;
  descricao: string;
  confidence: "alta" | "media" | "baixa";
  alternativas: RankedChoice[];
  candidatosAvaliados: number;
}

export interface CatmatHierarchyResult {
  success: boolean;
  codigoItem: number | null;
  descricaoItem: string | null;
  trail: HierarchyTrailStep[];
  logs: AIGenerationLog[];
  reason?: string;
}

export async function suggestCatmatHierarchy(objeto: string): Promise<CatmatHierarchyResult> {
  const trail: HierarchyTrailStep[] = [];
  const logs: AIGenerationLog[] = [];

  // 1) Grupo de Material (apenas ~78 — cabe tudo)
  const gruposResp = await listGruposMaterial({ tamanhoPagina: 200 });
  const grupos = extractResultado<CatalogoGrupoMaterial>(gruposResp);
  if (grupos.length === 0) {
    return {
      success: false,
      codigoItem: null,
      descricaoItem: null,
      trail,
      logs,
      reason: "Não foi possível listar grupos de material",
    };
  }
  const rankGrupo = await rankCandidatos({
    objeto,
    nivel: "Grupo de Material",
    candidatos: grupos.map((g) => ({ codigo: g.codigoGrupo, descricao: g.nomeGrupo })),
  });
  logs.push(rankGrupo.log);
  const topGrupo = rankGrupo.choices[0];
  if (!topGrupo) {
    return {
      success: false,
      codigoItem: null,
      descricaoItem: null,
      trail,
      logs,
      reason: "IA não encontrou grupo compatível",
    };
  }
  trail.push({
    nivel: "Grupo de Material",
    codigo: topGrupo.codigo,
    descricao: topGrupo.descricao,
    confidence: topGrupo.confidence,
    alternativas: rankGrupo.choices.slice(1),
    candidatosAvaliados: grupos.length,
  });

  // 2) Classe de Material
  const classesResp = await listClassesMaterial(topGrupo.codigo, { tamanhoPagina: 200 });
  const classes = extractResultado<CatalogoClasseMaterial>(classesResp);
  if (classes.length === 0) {
    return {
      success: false,
      codigoItem: null,
      descricaoItem: null,
      trail,
      logs,
      reason: `Grupo ${topGrupo.codigo} sem classes`,
    };
  }
  const rankClasse = await rankCandidatos({
    objeto,
    nivel: "Classe de Material",
    candidatos: classes.map((c) => ({ codigo: c.codigoClasse, descricao: c.nomeClasse })),
  });
  logs.push(rankClasse.log);
  const topClasse = rankClasse.choices[0];
  if (!topClasse) {
    return {
      success: false,
      codigoItem: null,
      descricaoItem: null,
      trail,
      logs,
      reason: "IA não encontrou classe compatível",
    };
  }
  trail.push({
    nivel: "Classe de Material",
    codigo: topClasse.codigo,
    descricao: topClasse.descricao,
    confidence: topClasse.confidence,
    alternativas: rankClasse.choices.slice(1),
    candidatosAvaliados: classes.length,
  });

  // 3) PDM (Padrão de Descrição de Material) — opcional, pulado se só houver 1 ou 0
  const pdmsResp = await listPdmsByClasse(topClasse.codigo, { tamanhoPagina: 500 });
  const pdms = extractResultado<CatalogoPdmMaterial>(pdmsResp);
  let codigoPdmChoose: number | null = null;
  if (pdms.length > 1) {
    const pdmCandidates = prefilterByKeywords(
      objeto,
      pdms.map((p) => ({ codigo: p.codigoPdm, descricao: p.nomePdm })),
      { maxReturn: 120 },
    );
    const rankPdm = await rankCandidatos({
      objeto,
      nivel: "PDM (Padrão Descritivo de Material)",
      candidatos: pdmCandidates,
    });
    logs.push(rankPdm.log);
    const topPdm = rankPdm.choices[0];
    if (topPdm) {
      codigoPdmChoose = topPdm.codigo;
      trail.push({
        nivel: "PDM",
        codigo: topPdm.codigo,
        descricao: topPdm.descricao,
        confidence: topPdm.confidence,
        alternativas: rankPdm.choices.slice(1),
        candidatosAvaliados: pdmCandidates.length,
      });
    }
  } else if (pdms.length === 1) {
    codigoPdmChoose = pdms[0].codigoPdm;
  }

  // 4) Item de Material
  const itensResp = codigoPdmChoose
    ? await listItensMaterialByPdm(codigoPdmChoose)
    : await listItensMaterialByClasse(topClasse.codigo);
  const itens = extractResultado<CatalogoItemMaterial>(itensResp);
  if (itens.length === 0) {
    return {
      success: false,
      codigoItem: null,
      descricaoItem: null,
      trail,
      logs,
      reason: "Sem itens no PDM/classe escolhido",
    };
  }
  const itemCandidates = prefilterByKeywords(
    objeto,
    itens.map((i) => ({ codigo: i.codigoItem, descricao: i.descricaoItem })),
    { maxReturn: 120 },
  );
  const rankItem = await rankCandidatos({
    objeto,
    nivel: "Item de Material",
    candidatos: itemCandidates,
  });
  logs.push(rankItem.log);
  const topItem = rankItem.choices[0];
  if (!topItem) {
    return {
      success: false,
      codigoItem: null,
      descricaoItem: null,
      trail,
      logs,
      reason: "IA não encontrou item compatível",
    };
  }
  trail.push({
    nivel: "Item de Material",
    codigo: topItem.codigo,
    descricao: topItem.descricao,
    confidence: topItem.confidence,
    alternativas: rankItem.choices.slice(1),
    candidatosAvaliados: itemCandidates.length,
  });

  return {
    success: true,
    codigoItem: topItem.codigo,
    descricaoItem: topItem.descricao,
    trail,
    logs,
  };
}

export interface CatserHierarchyResult {
  success: boolean;
  codigoServico: number | null;
  descricaoServico: string | null;
  trail: HierarchyTrailStep[];
  logs: AIGenerationLog[];
  reason?: string;
}

export async function suggestCatserHierarchy(objeto: string): Promise<CatserHierarchyResult> {
  const trail: HierarchyTrailStep[] = [];
  const logs: AIGenerationLog[] = [];

  // 1) Seção de Serviço (apenas 6)
  const secoesResp = await listSecoesServico();
  const secoes = extractResultado<CatalogoSecaoServico>(secoesResp);
  if (secoes.length === 0) {
    return {
      success: false,
      codigoServico: null,
      descricaoServico: null,
      trail,
      logs,
      reason: "Não foi possível listar seções de serviço",
    };
  }
  const rankSecao = await rankCandidatos({
    objeto,
    nivel: "Seção de Serviço",
    candidatos: secoes.map((s) => ({
      codigo: s.codigoSecao,
      descricao: s.nomeSecao,
    })),
  });
  logs.push(rankSecao.log);
  const topSecao = rankSecao.choices[0];
  if (!topSecao) {
    return {
      success: false,
      codigoServico: null,
      descricaoServico: null,
      trail,
      logs,
      reason: "IA não encontrou seção compatível",
    };
  }
  trail.push({
    nivel: "Seção de Serviço",
    codigo: topSecao.codigo,
    descricao: topSecao.descricao,
    confidence: topSecao.confidence,
    alternativas: rankSecao.choices.slice(1),
    candidatosAvaliados: secoes.length,
  });

  // 2) Divisão
  const divisoesResp = await listDivisoesServico(topSecao.codigo);
  const divisoes = extractResultado<CatalogoDivisaoServico>(divisoesResp);
  if (divisoes.length === 0) {
    return {
      success: false,
      codigoServico: null,
      descricaoServico: null,
      trail,
      logs,
      reason: `Seção ${topSecao.codigo} sem divisões`,
    };
  }
  const rankDivisao = await rankCandidatos({
    objeto,
    nivel: "Divisão de Serviço",
    candidatos: divisoes.map((d) => ({
      codigo: d.codigoDivisao,
      descricao: d.nomeDivisao,
    })),
  });
  logs.push(rankDivisao.log);
  const topDivisao = rankDivisao.choices[0];
  if (!topDivisao) {
    return {
      success: false,
      codigoServico: null,
      descricaoServico: null,
      trail,
      logs,
      reason: "IA não encontrou divisão compatível",
    };
  }
  trail.push({
    nivel: "Divisão de Serviço",
    codigo: topDivisao.codigo,
    descricao: topDivisao.descricao,
    confidence: topDivisao.confidence,
    alternativas: rankDivisao.choices.slice(1),
    candidatosAvaliados: divisoes.length,
  });

  // 3) Serviço (pulando Grupo/Classe/Subclasse para economizar chamadas)
  const itensResp = await listItensServicoByDivisao(topSecao.codigo, topDivisao.codigo, {
    tamanhoPagina: 500,
  });
  const itens = extractResultado<CatalogoItemServico>(itensResp);
  if (itens.length === 0) {
    return {
      success: false,
      codigoServico: null,
      descricaoServico: null,
      trail,
      logs,
      reason: `Divisão ${topDivisao.codigo} sem serviços`,
    };
  }
  const servicoCandidates = prefilterByKeywords(
    objeto,
    itens.map((i) => ({
      codigo: i.codigoServico,
      descricao: i.nomeServico ?? i.descricaoServico ?? "",
    })),
    { maxReturn: 120 },
  );
  const rankServico = await rankCandidatos({
    objeto,
    nivel: "Serviço",
    candidatos: servicoCandidates,
  });
  logs.push(rankServico.log);
  const topServico = rankServico.choices[0];
  if (!topServico) {
    return {
      success: false,
      codigoServico: null,
      descricaoServico: null,
      trail,
      logs,
      reason: "IA não encontrou serviço compatível",
    };
  }
  trail.push({
    nivel: "Serviço",
    codigo: topServico.codigo,
    descricao: topServico.descricao,
    confidence: topServico.confidence,
    alternativas: rankServico.choices.slice(1),
    candidatosAvaliados: servicoCandidates.length,
  });

  return {
    success: true,
    codigoServico: topServico.codigo,
    descricaoServico: topServico.descricao,
    trail,
    logs,
  };
}

// ── Filtrar amostras por comparabilidade ───────────────────────

export interface SampleForFilter {
  id: string;
  objetoResumo: string;
  valorGlobal: number;
  valorMensal?: number | null;
  dataAssinatura?: string | null;
}

export interface FilterResult {
  kept: string[];
  excluded: Array<{ id: string; reason: string }>;
  /**
   * Um log por chamada à IA. Em pesquisas grandes o filtro é particionado
   * em lotes (ver `FILTER_SAMPLES_CHUNK_SIZE`) — cada lote produz um log.
   * Logs de chunks bem-sucedidos são devolvidos mesmo quando outros
   * chunks falharam (ver `errors`) — compliance de auditoria exige
   * registrar todo consumo de IA já realizado.
   */
  logs: AIGenerationLog[];
  /**
   * Erros de chunks que falharam. Vazio em sucesso total. O caller decide
   * se considera falha parcial fatal (default) ou degrada. Sempre lance
   * pelo menos o primeiro erro; mantidas/excluídas só são consistentes
   * quando `errors.length === 0`.
   */
  errors: unknown[];
}

/**
 * Tamanho máximo de lote por chamada ao modelo de filtro.
 *
 * O `sabiazinho-3` tem contexto de 32k tokens. Cada amostra ocupa ~40-200
 * tokens no JSON serializado (objetoResumo chega a 1200 chars). Com 60
 * amostras por chunk ficamos com folga de ~3-4x sobre o teto, cobrindo
 * contratos com descrições muito longas sem estourar. O system prompt é
 * reenviado a cada chunk (~5% overhead por chunk) — tradeoff aceito.
 */
export const FILTER_SAMPLES_CHUNK_SIZE = 60;

async function runFilterChunk(params: {
  contratoObjeto: string;
  contratoValorGlobal: number;
  samples: SampleForFilter[];
}): Promise<{
  keptIds: string[];
  excluded: Array<{ id: string; reason: string }>;
  log: AIGenerationLog;
}> {
  const userPrompt = JSON.stringify({
    contratoAlvo: {
      objeto: params.contratoObjeto,
      valorGlobal: params.contratoValorGlobal,
    },
    amostras: params.samples.map((s, i) => ({
      indice: i,
      id: s.id,
      objeto: s.objetoResumo,
      valorGlobal: s.valorGlobal,
      valorMensal: s.valorMensal,
      dataAssinatura: s.dataAssinatura,
    })),
  });

  const result = await callMaritaca({
    model: modelFilter(),
    messages: [
      { role: "system", content: PROMPT_BY_PURPOSE.FILTER_SAMPLES },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    responseFormat: "json_object",
  });

  // Falha de parse propaga como AIResponseError — a ausência de filtro
  // deixa amostras não-comparáveis entrarem no cálculo, corrompendo a
  // média. Preferimos abortar e sinalizar ao usuário (toast "IA falhou,
  // tente novamente") a silenciosamente manter todas.
  const parsed = extractJson<{
    mantidas: number[];
    excluidas: Array<{ indice: number; motivo: string }>;
  }>(result.text, "FILTER_SAMPLES");

  const keptSet = new Set(parsed.mantidas ?? []);
  const keptIds: string[] = [];
  for (let i = 0; i < params.samples.length; i++) {
    if (keptSet.has(i)) keptIds.push(params.samples[i].id);
  }
  const excluded: Array<{ id: string; reason: string }> = [];
  for (const ex of parsed.excluidas ?? []) {
    const sample = params.samples[ex.indice];
    if (sample) excluded.push({ id: sample.id, reason: ex.motivo });
  }

  return {
    keptIds,
    excluded,
    log: {
      purpose: "FILTER_SAMPLES",
      model: result.model,
      systemPromptHash: promptHash("FILTER_SAMPLES"),
      userPrompt,
      response: result.text,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  };
}

/**
 * Filtra amostras não-comparáveis usando o modelo de IA. Particiona a lista
 * em lotes de no máximo `FILTER_SAMPLES_CHUNK_SIZE` para respeitar o limite
 * de contexto do modelo (`sabiazinho-3`: 32k tokens) — uma única pesquisa
 * pode trazer até 500 amostras, o que estouraria o contexto em ~2x.
 *
 * Chunks rodam em paralelo (`Promise.allSettled`): independentes entre si,
 * ganho de latência linear em N chunks. Usar `allSettled` em vez de `all`
 * para que um chunk falho não descarte os logs dos chunks bem-sucedidos —
 * o caller sempre recebe `logs` parciais para auditar o consumo de tokens
 * já efetivado, e decide via `errors.length` se trata como falha fatal.
 */
export async function filterSamples(params: {
  contratoObjeto: string;
  contratoValorGlobal: number;
  samples: SampleForFilter[];
}): Promise<FilterResult> {
  const { samples } = params;
  const chunks: SampleForFilter[][] = [];
  for (let offset = 0; offset < samples.length; offset += FILTER_SAMPLES_CHUNK_SIZE) {
    chunks.push(samples.slice(offset, offset + FILTER_SAMPLES_CHUNK_SIZE));
  }

  const settled = await Promise.allSettled(
    chunks.map((chunk) =>
      runFilterChunk({
        contratoObjeto: params.contratoObjeto,
        contratoValorGlobal: params.contratoValorGlobal,
        samples: chunk,
      }),
    ),
  );

  const kept: string[] = [];
  const excluded: Array<{ id: string; reason: string }> = [];
  const logs: AIGenerationLog[] = [];
  const errors: unknown[] = [];

  for (const s of settled) {
    if (s.status === "fulfilled") {
      kept.push(...s.value.keptIds);
      excluded.push(...s.value.excluded);
      logs.push(s.value.log);
    } else {
      errors.push(s.reason);
    }
  }

  return { kept, excluded, logs, errors };
}

// ── Redigir justificativa de economicidade ─────────────────────

export interface JustificativaParams {
  contrato: {
    numero: string;
    objeto: string;
    valorGlobal: number;
    valorMensal?: number | null;
    supplier: string;
    vigenciaInicio: string;
    vigenciaFim: string;
  };
  estatisticas: {
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    coefVariation: number;
  };
  periodoReferencia: { inicio: string; fim: string };
  fonte: string;
}

export interface JustificativaResult {
  texto: string;
  log: AIGenerationLog;
}

// ── Preencher campo livre de documento (genérico) ──────────────

export interface FillFreeFieldParams {
  templateTitle: string;
  sectionLabel: string;
  lawRegime?: "LEI_14133_2021" | "LEI_8666_1993";
  contractData: Record<string, unknown>;
  existingText?: string;
  userHint?: string;
  extraContext?: Record<string, unknown>;
}

export interface FillFreeFieldResult {
  text: string;
  log: AIGenerationLog;
}

export async function fillFreeField(params: FillFreeFieldParams): Promise<FillFreeFieldResult> {
  const userPrompt = JSON.stringify({
    documento: params.templateTitle,
    secao: params.sectionLabel,
    baseLegal: params.lawRegime === "LEI_8666_1993" ? "Lei 8.666/1993" : "Lei 14.133/2021",
    contrato: params.contractData,
    textoAtual: params.existingText ?? null,
    dicaDoUsuario: params.userHint ?? null,
    contextoAdicional: params.extraContext ?? null,
  });

  const result = await callMaritaca({
    model: modelWriter(),
    messages: [
      { role: "system", content: PROMPT_BY_PURPOSE.FILL_FREE_FIELD },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
  });

  return {
    text: result.text.trim(),
    log: {
      purpose: "FILL_FREE_FIELD",
      model: result.model,
      systemPromptHash: promptHash("FILL_FREE_FIELD"),
      userPrompt,
      response: result.text,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  };
}

// ── Checagem de coerência de documento ──────────────────────────

export interface CoherenceWarning {
  severidade: "alta" | "media" | "baixa";
  campo: string | null;
  mensagem: string;
}

export interface CoherenceCheckParams {
  templateTitle: string;
  lawRegime?: "LEI_14133_2021" | "LEI_8666_1993";
  draft: Record<string, unknown>;
}

export interface CoherenceCheckResult {
  ok: boolean;
  warnings: CoherenceWarning[];
  log: AIGenerationLog;
}

export async function coherenceCheck(params: CoherenceCheckParams): Promise<CoherenceCheckResult> {
  const userPrompt = JSON.stringify({
    documento: params.templateTitle,
    baseLegal: params.lawRegime === "LEI_8666_1993" ? "Lei 8.666/1993" : "Lei 14.133/2021",
    draft: params.draft,
  });

  const result = await callMaritaca({
    model: modelWriter(),
    messages: [
      { role: "system", content: PROMPT_BY_PURPOSE.COHERENCE_CHECK },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.0,
    responseFormat: "json_object",
  });

  // Coherence check é best-effort: se a IA não devolve JSON, assumimos
  // "sem avisos" em vez de abortar a geração do documento.
  const parsed = tryExtractJson<{ ok: boolean; avisos: CoherenceWarning[] }>(
    result.text,
    "COHERENCE_CHECK",
  );

  return {
    ok: parsed?.ok ?? true,
    warnings: parsed?.avisos ?? [],
    log: {
      purpose: "COHERENCE_CHECK",
      model: result.model,
      systemPromptHash: promptHash("COHERENCE_CHECK"),
      userPrompt,
      response: result.text,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  };
}

export async function writeJustificativa(
  params: JustificativaParams,
): Promise<JustificativaResult> {
  const userPrompt = JSON.stringify(params);
  const result = await callMaritaca({
    model: modelWriter(),
    messages: [
      { role: "system", content: PROMPT_BY_PURPOSE.WRITE_JUSTIFICATIVA },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
  });

  return {
    texto: result.text.trim(),
    log: {
      purpose: "WRITE_JUSTIFICATIVA",
      model: result.model,
      systemPromptHash: promptHash("WRITE_JUSTIFICATIVA"),
      userPrompt,
      response: result.text,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  };
}

// ── Contexto por item do contrato ──────────────────────────────
//
// As funções acima aceitam o objeto do contrato inteiro. Na pesquisa por
// item, a IA ganha contexto mais específico: descrição, especificação
// detalhada e tipo do ContractItem. Wrappers abaixo serializam esse
// contexto em um texto sintético compatível com o pipeline existente.

export interface ItemContextInput {
  description: string;
  detailedSpecification?: string | null;
  itemType?: string | null;
  unitOfMeasure?: string | null;
}

/**
 * Serializa os campos do item em um texto sintético. Usado como `objeto`
 * para as funções hierárquicas de CATMAT/CATSER e como descritor em
 * filtros de amostras. Mantém ordem estável para cache de prompt.
 */
export function buildItemContext(item: ItemContextInput): string {
  const parts: string[] = [];
  parts.push(`Descrição: ${item.description.trim()}`);
  const spec = item.detailedSpecification?.trim();
  if (spec && spec.length > 0 && spec !== item.description.trim()) {
    parts.push(`Especificação: ${spec}`);
  }
  if (item.itemType) parts.push(`Tipo: ${item.itemType}`);
  if (item.unitOfMeasure) parts.push(`Unidade: ${item.unitOfMeasure}`);
  return parts.join("\n");
}

export function suggestCatmatHierarchyFromItem(
  item: ItemContextInput,
): Promise<CatmatHierarchyResult> {
  return suggestCatmatHierarchy(buildItemContext(item));
}

export function suggestCatserHierarchyFromItem(
  item: ItemContextInput,
): Promise<CatserHierarchyResult> {
  return suggestCatserHierarchy(buildItemContext(item));
}

/**
 * Filtro de amostras contextualizado por item. O valor de referência passa
 * a ser o valor total do item (quantidade × unitário) em vez do valor
 * global do contrato — reduz falsos positivos quando o contrato tem itens
 * de magnitudes muito diferentes.
 */
export function filterSamplesForItem(params: {
  item: ItemContextInput;
  itemTotalValue: number;
  samples: SampleForFilter[];
}): Promise<FilterResult> {
  return filterSamples({
    contratoObjeto: buildItemContext(params.item),
    contratoValorGlobal: params.itemTotalValue,
    samples: params.samples,
  });
}
