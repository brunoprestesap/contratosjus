import { callMaritaca, modelFilter, modelWriter } from "@/lib/ai/client";
import {
  PROMPT_BY_PURPOSE,
  promptHash,
  type PromptPurpose,
} from "@/lib/ai/prompts";
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
import { prefilterByKeywords } from "@/lib/text-match";
import type {
  CatalogoClasseMaterial,
  CatalogoDivisaoServico,
  CatalogoGrupoMaterial,
  CatalogoItemMaterial,
  CatalogoItemServico,
  CatalogoPdmMaterial,
  CatalogoSecaoServico,
  ComprasPagedResponse,
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

function extractJson<T>(text: string): T | null {
  // Tenta achar bloco JSON mesmo quando modelo envolve em prosa ou code fences
  const trimmed = text.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
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
  limitCandidates = 15
): Promise<CatmatSuggestionResult> {
  const search = await searchItemMaterialByDescricao({
    descricaoItem: objeto,
    tamanhoPagina: Math.max(10, limitCandidates),
    statusItem: true,
  });
  const candidates =
    search._embedded?.resultado ??
    search.resultado ??
    search._embedded?.itens ??
    [];

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

  const suggestion = extractJson<CatmatSuggestion>(result.text);

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

function extractList<T>(body: ComprasPagedResponse<T>): T[] {
  return body._embedded?.resultado ?? body.resultado ?? body._embedded?.itens ?? [];
}

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

  const parsed = extractJson<{ escolhas: RankedChoice[] }>(result.text);
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

export async function suggestCatmatHierarchy(
  objeto: string
): Promise<CatmatHierarchyResult> {
  const trail: HierarchyTrailStep[] = [];
  const logs: AIGenerationLog[] = [];

  // 1) Grupo de Material (apenas ~78 — cabe tudo)
  const gruposResp = await listGruposMaterial({ tamanhoPagina: 200 });
  const grupos = extractList<CatalogoGrupoMaterial>(gruposResp);
  if (grupos.length === 0) {
    return { success: false, codigoItem: null, descricaoItem: null, trail, logs, reason: "Não foi possível listar grupos de material" };
  }
  const rankGrupo = await rankCandidatos({
    objeto,
    nivel: "Grupo de Material",
    candidatos: grupos.map((g) => ({ codigo: g.codigoGrupo, descricao: g.nomeGrupo })),
  });
  logs.push(rankGrupo.log);
  const topGrupo = rankGrupo.choices[0];
  if (!topGrupo) {
    return { success: false, codigoItem: null, descricaoItem: null, trail, logs, reason: "IA não encontrou grupo compatível" };
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
  const classes = extractList<CatalogoClasseMaterial>(classesResp);
  if (classes.length === 0) {
    return { success: false, codigoItem: null, descricaoItem: null, trail, logs, reason: `Grupo ${topGrupo.codigo} sem classes` };
  }
  const rankClasse = await rankCandidatos({
    objeto,
    nivel: "Classe de Material",
    candidatos: classes.map((c) => ({ codigo: c.codigoClasse, descricao: c.nomeClasse })),
  });
  logs.push(rankClasse.log);
  const topClasse = rankClasse.choices[0];
  if (!topClasse) {
    return { success: false, codigoItem: null, descricaoItem: null, trail, logs, reason: "IA não encontrou classe compatível" };
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
  const pdms = extractList<CatalogoPdmMaterial>(pdmsResp);
  let codigoPdmChoose: number | null = null;
  if (pdms.length > 1) {
    const pdmCandidates = prefilterByKeywords(
      objeto,
      pdms.map((p) => ({ codigo: p.codigoPdm, descricao: p.nomePdm })),
      { maxReturn: 120 }
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
  const itens = extractList<CatalogoItemMaterial>(itensResp);
  if (itens.length === 0) {
    return { success: false, codigoItem: null, descricaoItem: null, trail, logs, reason: "Sem itens no PDM/classe escolhido" };
  }
  const itemCandidates = prefilterByKeywords(
    objeto,
    itens.map((i) => ({ codigo: i.codigoItem, descricao: i.descricaoItem })),
    { maxReturn: 120 }
  );
  const rankItem = await rankCandidatos({
    objeto,
    nivel: "Item de Material",
    candidatos: itemCandidates,
  });
  logs.push(rankItem.log);
  const topItem = rankItem.choices[0];
  if (!topItem) {
    return { success: false, codigoItem: null, descricaoItem: null, trail, logs, reason: "IA não encontrou item compatível" };
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

export async function suggestCatserHierarchy(
  objeto: string
): Promise<CatserHierarchyResult> {
  const trail: HierarchyTrailStep[] = [];
  const logs: AIGenerationLog[] = [];

  // 1) Seção de Serviço (apenas 6)
  const secoesResp = await listSecoesServico();
  const secoes = extractList<CatalogoSecaoServico>(secoesResp);
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
  const divisoes = extractList<CatalogoDivisaoServico>(divisoesResp);
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
  const itensResp = await listItensServicoByDivisao(
    topSecao.codigo,
    topDivisao.codigo,
    { tamanhoPagina: 500 }
  );
  const itens = extractList<CatalogoItemServico>(itensResp);
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
    { maxReturn: 120 }
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
  log: AIGenerationLog;
}

export async function filterSamples(params: {
  contratoObjeto: string;
  contratoValorGlobal: number;
  samples: SampleForFilter[];
}): Promise<FilterResult> {
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

  const parsed = extractJson<{
    mantidas: number[];
    excluidas: Array<{ indice: number; motivo: string }>;
  }>(result.text);

  const keptIds: string[] = [];
  const excluded: Array<{ id: string; reason: string }> = [];

  if (parsed) {
    const keptSet = new Set(parsed.mantidas ?? []);
    for (let i = 0; i < params.samples.length; i++) {
      if (keptSet.has(i)) keptIds.push(params.samples[i].id);
    }
    for (const ex of parsed.excluidas ?? []) {
      const sample = params.samples[ex.indice];
      if (sample) excluded.push({ id: sample.id, reason: ex.motivo });
    }
  } else {
    // IA falhou em retornar JSON: fallback conservador = manter todas
    for (const s of params.samples) keptIds.push(s.id);
  }

  return {
    kept: keptIds,
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

export async function fillFreeField(
  params: FillFreeFieldParams
): Promise<FillFreeFieldResult> {
  const userPrompt = JSON.stringify({
    documento: params.templateTitle,
    secao: params.sectionLabel,
    baseLegal:
      params.lawRegime === "LEI_8666_1993"
        ? "Lei 8.666/1993"
        : "Lei 14.133/2021",
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

export async function coherenceCheck(
  params: CoherenceCheckParams
): Promise<CoherenceCheckResult> {
  const userPrompt = JSON.stringify({
    documento: params.templateTitle,
    baseLegal:
      params.lawRegime === "LEI_8666_1993"
        ? "Lei 8.666/1993"
        : "Lei 14.133/2021",
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

  const parsed = extractJson<{ ok: boolean; avisos: CoherenceWarning[] }>(
    result.text
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
  params: JustificativaParams
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
