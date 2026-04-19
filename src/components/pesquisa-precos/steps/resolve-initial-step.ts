import type { WireResearchDetail } from "@/lib/pesquisa-precos/mappers";
import type { StepKey } from "@/components/pesquisa-precos/steps/types";

/**
 * Decide qual aba abrir ao entrar na pesquisa. Função pura — facilita
 * testar a árvore de decisão do wizard sem renderizar React.
 *
 * Ordem de prioridade:
 *   1. Pesquisa finalizada → "finalizar" (visão somente-leitura)
 *   2. Sem código → "codigo" (pré-requisito)
 *   3. Sem amostras → "consulta"
 *   4. Amostras consultadas mas não filtradas → "amostras"
 *   5. Amostras filtradas sem justificativa → "justificativa"
 *   6. Caso-geral → "amostras" (retomar revisão manual)
 */
export function resolveInitialStep(research: WireResearchDetail): StepKey {
  if (research.status === "FINALIZED") return "finalizar";

  const codigo = research.itemType === "MATERIAL" ? research.catmatCode : research.catserCode;
  if (!codigo) return "codigo";

  if (research.samples.length === 0) return "consulta";
  if (research.status === "PNCP_QUERIED") return "amostras";
  if (research.status === "AI_FILTERED" && !research.justificationText) return "justificativa";
  return "amostras";
}
