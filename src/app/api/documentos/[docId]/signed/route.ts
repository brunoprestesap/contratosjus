import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  resolveAbsoluteFromRelative,
  UnsafePathError,
} from "@/lib/documents/engine/storage";
import { sanitizeFilename } from "@/lib/pdf/styles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { docId } = await params;
  const doc = await prisma.generatedDocument.findUnique({
    where: { id: docId },
    select: {
      signedPdfPath: true,
      title: true,
      version: true,
      contract: { select: { contractNumber: true } },
    },
  });
  if (!doc || !doc.signedPdfPath) {
    return NextResponse.json(
      { error: "PDF assinado não encontrado" },
      { status: 404 }
    );
  }

  try {
    const absolute = resolveAbsoluteFromRelative(doc.signedPdfPath);
    const buffer = await readFile(absolute);
    const filename = sanitizeFilename(
      `${doc.title}-${doc.contract.contractNumber}-v${doc.version}-assinado.pdf`
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof UnsafePathError) {
      console.error("Unsafe signed document path detected");
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error(
      "Signed PDF serve error:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Erro ao baixar PDF assinado" },
      { status: 500 }
    );
  }
}
