import type { WireResearchDetail } from "@/lib/pesquisa-precos/mappers";

export const STEP_KEYS = ["codigo", "consulta", "amostras", "justificativa", "finalizar"] as const;
export type StepKey = (typeof STEP_KEYS)[number];

/**
 * Props comuns a todos os steps do wizard. `onChanged` recarrega o RSC pai
 * (router.refresh) após mutations para re-hidratar `research` do servidor.
 */
export interface StepProps {
  research: WireResearchDetail;
  disabled: boolean;
  onChanged: () => void;
}
