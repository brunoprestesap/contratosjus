import type { DocumentCategory, LegalRegime } from "@/generated/prisma/client";
import type { ReactElement } from "react";

export type SectionKind = "DATA" | "AI" | "MANUAL";

export interface SectionSpec {
  id: string;
  label: string;
  kind: SectionKind;
  required: boolean;
}

export interface TemplateMetadata {
  id: string;
  title: string;
  category: DocumentCategory;
  regimes: LegalRegime[];
  description: string;
  sections: SectionSpec[];
}

export interface TemplateLoadParams {
  contractId: string;
  paymentId?: string;
  additiveId?: string;
  priceResearchId?: string;
  fiscalOccurrenceId?: string;
  manualFields?: Record<string, string>;
  aiFields?: Record<string, string>;
}

export interface TemplateModule<TData = unknown> {
  metadata: TemplateMetadata;
  loadData: (params: TemplateLoadParams) => Promise<TData>;
  render: (data: TData) => ReactElement;
}
