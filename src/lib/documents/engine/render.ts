import { renderToBuffer } from "@react-pdf/renderer";
import { getTemplate } from "@/lib/documents/templates/registry";
import { resolveDocumentPath, writeDocument, sha256 } from "@/lib/documents/engine/storage";

export interface RenderInput {
  templateId: string;
  contractId: string;
  version: number;
  paymentId?: string;
  additiveId?: string;
  priceResearchId?: string;
  fiscalOccurrenceId?: string;
  manualFields?: Record<string, string>;
  aiFields?: Record<string, string>;
}

export interface RenderOutput {
  inputData: unknown;
  pdfPath: string;
  pdfChecksum: string;
}

export async function renderDocument(input: RenderInput): Promise<RenderOutput> {
  const template = getTemplate(input.templateId);

  const data = await template.loadData({
    contractId: input.contractId,
    paymentId: input.paymentId,
    additiveId: input.additiveId,
    priceResearchId: input.priceResearchId,
    fiscalOccurrenceId: input.fiscalOccurrenceId,
    manualFields: input.manualFields,
    aiFields: input.aiFields,
  });

  const element = template.render(data);
  // Cast necessário: o typing de @react-pdf/renderer define DocumentProps com
  // `children` obrigatório, mas nosso ReactElement genérico não carrega essa
  // informação. O template sempre retorna <Document>, então é seguro na
  // runtime.
  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
  const uint8 = new Uint8Array(buffer);

  const { absolutePath, relativePath } = resolveDocumentPath(
    input.contractId,
    input.templateId,
    input.version,
  );

  const checksum = await writeDocument(absolutePath, uint8);

  return {
    inputData: data,
    pdfPath: relativePath,
    pdfChecksum: checksum,
  };
}

export { sha256 };
