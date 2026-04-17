-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('PROROGACAO', 'FISCALIZACAO', 'CONTRATACAO', 'ENCERRAMENTO');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'SIGNED', 'ARCHIVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('DRAFT', 'PNCP_QUERIED', 'AI_FILTERED', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ResearchItemType" AS ENUM ('SERVICE', 'MATERIAL');

-- CreateEnum
CREATE TYPE "AIPurpose" AS ENUM ('SUGGEST_CATSER', 'FILTER_SAMPLES', 'WRITE_FREE_FIELD', 'COHERENCE_CHECK');

-- CreateEnum
CREATE TYPE "FiscalOccurrenceType" AS ENUM ('ATRASO', 'DESCUMPRIMENTO', 'QUALIDADE', 'SEGURANCA', 'OUTRO');

-- CreateEnum
CREATE TYPE "FiscalOccurrenceSeverity" AS ENUM ('LEVE', 'MEDIA', 'GRAVE');

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "catmatCode" TEXT,
ADD COLUMN     "catserCode" TEXT;

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "additiveId" TEXT,
    "paymentId" TEXT,
    "priceResearchId" TEXT,
    "fiscalOccurrenceId" TEXT,
    "templateId" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "regime" "LegalRegime" NOT NULL DEFAULT 'LEI_14133_2021',
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "inputData" JSONB NOT NULL,
    "manualFields" JSONB,
    "aiFields" JSONB,
    "pdfPath" TEXT,
    "pdfChecksum" TEXT,
    "signedPdfPath" TEXT,
    "signedChecksum" TEXT,
    "signedAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "generatedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_generations" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "AIPurpose" NOT NULL,
    "model" TEXT NOT NULL,
    "systemPromptHash" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheReadTokens" INTEGER,
    "cacheCreationTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_researches" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "additiveId" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "ResearchStatus" NOT NULL DEFAULT 'DRAFT',
    "catserCode" TEXT,
    "catmatCode" TEXT,
    "itemType" "ResearchItemType" NOT NULL,
    "queryFilters" JSONB,
    "queriedAt" TIMESTAMP(3),
    "mean" DECIMAL(15,2),
    "median" DECIMAL(15,2),
    "minValue" DECIMAL(15,2),
    "maxValue" DECIMAL(15,2),
    "stdDev" DECIMAL(15,2),
    "coefVariation" DECIMAL(8,4),
    "justificationText" TEXT,
    "justificationEditedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_researches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_samples" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "pncpNumeroControle" TEXT NOT NULL,
    "pncpContractId" TEXT,
    "orgao" TEXT,
    "cnpjFornecedor" TEXT,
    "objetoResumo" TEXT NOT NULL,
    "valorGlobal" DECIMAL(15,2) NOT NULL,
    "valorMensal" DECIMAL(15,2),
    "dataAssinatura" TIMESTAMP(3),
    "modalidade" TEXT,
    "uf" TEXT,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "exclusionReason" TEXT,
    "excludedByAI" BOOLEAN,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_occurrences" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" "FiscalOccurrenceType" NOT NULL,
    "severity" "FiscalOccurrenceSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "evidences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_priceResearchId_key" ON "generated_documents"("priceResearchId");

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_fiscalOccurrenceId_key" ON "generated_documents"("fiscalOccurrenceId");

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_supersededById_key" ON "generated_documents"("supersededById");

-- CreateIndex
CREATE INDEX "generated_documents_contractId_idx" ON "generated_documents"("contractId");

-- CreateIndex
CREATE INDEX "generated_documents_templateId_idx" ON "generated_documents"("templateId");

-- CreateIndex
CREATE INDEX "generated_documents_status_idx" ON "generated_documents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_contractId_templateId_version_key" ON "generated_documents"("contractId", "templateId", "version");

-- CreateIndex
CREATE INDEX "document_generations_documentId_idx" ON "document_generations"("documentId");

-- CreateIndex
CREATE INDEX "document_generations_userId_idx" ON "document_generations"("userId");

-- CreateIndex
CREATE INDEX "price_researches_contractId_idx" ON "price_researches"("contractId");

-- CreateIndex
CREATE INDEX "price_researches_additiveId_idx" ON "price_researches"("additiveId");

-- CreateIndex
CREATE INDEX "price_researches_status_idx" ON "price_researches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "price_samples_pncpNumeroControle_key" ON "price_samples"("pncpNumeroControle");

-- CreateIndex
CREATE INDEX "price_samples_researchId_idx" ON "price_samples"("researchId");

-- CreateIndex
CREATE INDEX "price_samples_excluded_idx" ON "price_samples"("excluded");

-- CreateIndex
CREATE INDEX "fiscal_occurrences_contractId_idx" ON "fiscal_occurrences"("contractId");

-- CreateIndex
CREATE INDEX "fiscal_occurrences_occurredAt_idx" ON "fiscal_occurrences"("occurredAt");

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "generated_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_priceResearchId_fkey" FOREIGN KEY ("priceResearchId") REFERENCES "price_researches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_fiscalOccurrenceId_fkey" FOREIGN KEY ("fiscalOccurrenceId") REFERENCES "fiscal_occurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_generations" ADD CONSTRAINT "document_generations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "generated_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_generations" ADD CONSTRAINT "document_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_researches" ADD CONSTRAINT "price_researches_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_researches" ADD CONSTRAINT "price_researches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_samples" ADD CONSTRAINT "price_samples_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "price_researches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_occurrences" ADD CONSTRAINT "fiscal_occurrences_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_occurrences" ADD CONSTRAINT "fiscal_occurrences_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

