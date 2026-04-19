import { logAudit } from "@/lib/audit";
import type { AIGenerationLog } from "@/lib/ai/generate";

/**
 * Registra uma chamada de IA no log de auditoria sob a entidade
 * dedicada `AICall` (não polui o histórico da entidade de domínio).
 * `entityId` carrega o researchId como contexto. Quando a pesquisa é
 * finalizada, a rastreabilidade adicional fica em `DocumentGeneration`
 * vinculado ao `GeneratedDocument`.
 */
export async function logAIGeneration(params: {
  log: AIGenerationLog;
  researchId: string;
}): Promise<void> {
  await logAudit({
    entity: "AICall",
    entityId: params.researchId,
    action: "CREATE",
    newValue: {
      aiPurpose: params.log.purpose,
      aiModel: params.log.model,
      systemPromptHash: params.log.systemPromptHash,
      inputTokens: params.log.inputTokens,
      outputTokens: params.log.outputTokens,
      contextResearchId: params.researchId,
    },
  });
}
