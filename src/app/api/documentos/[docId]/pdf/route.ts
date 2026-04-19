import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { resolveAbsoluteFromRelative, UnsafePathError } from "@/lib/documents/engine/storage";
import { sanitizeFilename } from "@/lib/pdf/styles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { docId } = await params;

  try {
    const document = await prisma.generatedDocument.findUnique({
      where: { id: docId },
      select: {
        pdfPath: true,
        title: true,
        version: true,
        contract: { select: { contractNumber: true } },
      },
    });

    if (!document || !document.pdfPath) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    const absolute = resolveAbsoluteFromRelative(document.pdfPath);
    const buffer = await readFile(absolute);

    const filename = sanitizeFilename(
      `${document.title}-${document.contract.contractNumber}-v${document.version}.pdf`,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof UnsafePathError) {
      logger.warn(
        { event: "security.unsafe_path", route: "documentos/pdf", docId },
        "Unsafe document path detected",
      );
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    logger.error({ err: error, route: "documentos/pdf", docId }, "PDF serve error");
    return NextResponse.json({ error: "Erro ao baixar documento" }, { status: 500 });
  }
}
