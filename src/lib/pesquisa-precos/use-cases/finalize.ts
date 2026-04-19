import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { renderDocument } from "@/lib/documents/engine/render";
import { MIN_SAMPLES_TO_FINALIZE } from "@/lib/pesquisa-precos/constants";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";

// Re-export para que callers que já importavam daqui (ex.: testes)
// continuem funcionando sem mudança — use-case é o ponto natural.
export { MIN_SAMPLES_TO_FINALIZE };

const TEMPLATE_ID = "prorrogacao.pesquisa-precos";

export async function finalizeResearchUseCase(
  researchId: string,
  userId: string,
): Promise<{ researchId: string; contractId: string }> {
  const research = await prisma.priceResearch.findUnique({
    where: { id: researchId },
    include: { samples: { where: { excluded: false }, select: { id: true } } },
  });
  if (!research) throw new ResearchDomainError("Pesquisa não encontrada");

  if (research.samples.length < MIN_SAMPLES_TO_FINALIZE) {
    throw new ResearchDomainError(
      `A finalização exige ao menos ${MIN_SAMPLES_TO_FINALIZE} amostras válidas (Manual CNJ). Atual: ${research.samples.length}.`,
    );
  }
  if (!research.justificationText || research.justificationText.length < 10) {
    throw new ResearchDomainError("Preencha a justificativa antes de finalizar");
  }

  // `findFirst`, `renderDocument` e os writes ficam juntos dentro da
  // transação com isolation `Serializable` para fechar a janela de race
  // onde dois requests concorrentes leriam o mesmo `existingLatest` e
  // calcolariam a mesma `nextVersion`. Em conflito, o Postgres aborta
  // uma das transações (`40001 serialization_failure`) — o Prisma lança
  // `PrismaClientKnownRequestError` e o caller vê uma falha clara
  // (aceitável para o volume esperado; sem retry automático).
  const renderedChecksum = await prisma.$transaction(
    async (tx) => {
      const existingLatest = await tx.generatedDocument.findFirst({
        where: { contractId: research.contractId, templateId: TEMPLATE_ID },
        orderBy: { version: "desc" },
      });
      const nextVersion = existingLatest ? existingLatest.version + 1 : 1;

      // `renderDocument` usa o prisma singleton dentro de `template.loadData`
      // (não `tx`). Aceitável: a pesquisa já existe antes da transação e
      // os dados lidos são estáveis durante este fluxo.
      const rendered = await renderDocument({
        templateId: TEMPLATE_ID,
        contractId: research.contractId,
        version: nextVersion,
        priceResearchId: researchId,
      });

      if (existingLatest && existingLatest.status !== "SUPERSEDED") {
        await tx.generatedDocument.update({
          where: { id: existingLatest.id },
          data: { status: "SUPERSEDED" },
        });
      }
      await tx.generatedDocument.create({
        data: {
          contractId: research.contractId,
          priceResearchId: researchId,
          templateId: TEMPLATE_ID,
          category: "PROROGACAO",
          status: "GENERATED",
          version: nextVersion,
          title: "Pesquisa de Preços",
          inputData: rendered.inputData as Prisma.InputJsonValue,
          pdfPath: rendered.pdfPath,
          pdfChecksum: rendered.pdfChecksum,
          generatedAt: new Date(),
          createdById: userId,
          supersededById:
            existingLatest && existingLatest.status !== "SUPERSEDED" ? existingLatest.id : null,
        },
      });
      await tx.priceResearch.update({
        where: { id: researchId },
        data: { status: "FINALIZED", finalizedAt: new Date() },
      });
      return rendered.pdfChecksum;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await logAudit({
    entity: "PriceResearch",
    entityId: researchId,
    action: "UPDATE",
    newValue: { status: "FINALIZED", generatedChecksum: renderedChecksum },
  });

  return { researchId, contractId: research.contractId };
}
