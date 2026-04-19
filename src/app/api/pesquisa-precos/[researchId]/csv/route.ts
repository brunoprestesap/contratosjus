import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv/to-csv";
import { sanitizeFilename } from "@/lib/pdf/styles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ researchId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { researchId } = await params;

  const research = await prisma.priceResearch.findUnique({
    where: { id: researchId },
    include: {
      contract: { select: { contractNumber: true } },
      samples: { orderBy: { valorGlobal: "asc" } },
    },
  });
  if (!research) {
    return NextResponse.json({ error: "Pesquisa não encontrada" }, { status: 404 });
  }

  const csv = toCsv(research.samples, [
    { header: "Status", value: (s) => (s.excluded ? "Excluída" : "Válida") },
    { header: "Motivo Exclusão", value: (s) => s.exclusionReason ?? "" },
    { header: "Órgão", value: (s) => s.orgao ?? "" },
    { header: "CNPJ Fornecedor", value: (s) => s.cnpjFornecedor ?? "" },
    { header: "UF", value: (s) => s.uf ?? "" },
    { header: "Modalidade", value: (s) => s.modalidade ?? "" },
    {
      header: "Data Assinatura",
      value: (s) => (s.dataAssinatura ? s.dataAssinatura.toISOString().slice(0, 10) : ""),
    },
    {
      header: "Valor Global (R$)",
      value: (s) => parseFloat(s.valorGlobal.toString()),
    },
    {
      header: "Valor Mensal (R$)",
      value: (s) => (s.valorMensal ? parseFloat(s.valorMensal.toString()) : ""),
    },
    { header: "Nº Controle", value: (s) => s.pncpNumeroControle },
    { header: "Objeto", value: (s) => s.objetoResumo },
  ]);

  const filename = sanitizeFilename(
    `pesquisa-precos-${research.contract.contractNumber}-${researchId.slice(0, 8)}.csv`,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
