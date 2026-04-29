import type { TemplateModule } from "@/lib/documents/engine/types";
import { atesteNfTemplate } from "@/lib/documents/templates/fiscalizacao/ateste-nf";
import { notificacaoTemplate } from "@/lib/documents/templates/fiscalizacao/notificacao";
import { registroOcorrenciaTemplate } from "@/lib/documents/templates/fiscalizacao/registro-ocorrencia";
import { relatorioFiscalTemplate } from "@/lib/documents/templates/fiscalizacao/relatorio-fiscal";
import { pesquisaPrecosTemplate } from "@/lib/documents/templates/prorrogacao/pesquisa-precos";
import { pesquisaPrecosConsolidadoTemplate } from "@/lib/documents/templates/prorrogacao/pesquisa-precos-consolidado";
import { justificativaEconomicidadeTemplate } from "@/lib/documents/templates/prorrogacao/justificativa-economicidade";
import { termoAditivoTemplate } from "@/lib/documents/templates/prorrogacao/termo-aditivo";
import { solicitacaoParecerTemplate } from "@/lib/documents/templates/prorrogacao/solicitacao-parecer";

const registry: Record<string, TemplateModule<unknown>> = {
  [atesteNfTemplate.metadata.id]: atesteNfTemplate as TemplateModule<unknown>,
  [notificacaoTemplate.metadata.id]: notificacaoTemplate as TemplateModule<unknown>,
  [registroOcorrenciaTemplate.metadata.id]: registroOcorrenciaTemplate as TemplateModule<unknown>,
  [relatorioFiscalTemplate.metadata.id]: relatorioFiscalTemplate as TemplateModule<unknown>,
  [pesquisaPrecosTemplate.metadata.id]: pesquisaPrecosTemplate as TemplateModule<unknown>,
  [pesquisaPrecosConsolidadoTemplate.metadata.id]:
    pesquisaPrecosConsolidadoTemplate as TemplateModule<unknown>,
  [justificativaEconomicidadeTemplate.metadata.id]:
    justificativaEconomicidadeTemplate as TemplateModule<unknown>,
  [termoAditivoTemplate.metadata.id]: termoAditivoTemplate as TemplateModule<unknown>,
  [solicitacaoParecerTemplate.metadata.id]: solicitacaoParecerTemplate as TemplateModule<unknown>,
};

export function getTemplate(id: string): TemplateModule<unknown> {
  const template = registry[id];
  if (!template) {
    throw new Error(`Template não registrado: ${id}`);
  }
  return template;
}

export function listTemplates(): TemplateModule<unknown>["metadata"][] {
  return Object.values(registry).map((t) => t.metadata);
}
