-- CreateEnum
CREATE TYPE "PriceSampleSource" AS ENUM ('PAINEL_PRECOS', 'CONTRATO_PUBLICO', 'MIDIA', 'COTACAO_DIRETA', 'SINAPI', 'CATALOGO_TIC', 'OUTRO');

-- CreateEnum
CREATE TYPE "ReferenceMethod" AS ENUM ('NONE', 'MEAN', 'MEDIAN', 'MIN', 'CUSTOM');

-- AlterTable
ALTER TABLE "price_research_items" ADD COLUMN     "adjustmentPercent" DECIMAL(6,3),
ADD COLUMN     "exceptionJustification" TEXT,
ADD COLUMN     "methodJustification" TEXT,
ADD COLUMN     "referenceMethod" "ReferenceMethod" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "referenceValue" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "price_samples" ADD COLUMN     "createdManually" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" "PriceSampleSource" NOT NULL DEFAULT 'PAINEL_PRECOS',
ADD COLUMN     "sourceNotes" TEXT,
ADD COLUMN     "supplierName" TEXT;

-- CreateIndex
CREATE INDEX "price_samples_source_idx" ON "price_samples"("source");
