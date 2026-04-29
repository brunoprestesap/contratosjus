-- CreateEnum
CREATE TYPE "ResearchMode" AS ENUM ('CONTRACT_LEGACY', 'PER_ITEM');

-- CreateEnum
CREATE TYPE "CodeSource" AS ENUM ('PENDING', 'ITEM', 'AI', 'MANUAL');

-- AlterTable
ALTER TABLE "price_researches" ADD COLUMN     "legalRegimeFilterOn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "legalRegimeSnapshot" "LegalRegime",
ADD COLUMN     "mode" "ResearchMode" NOT NULL DEFAULT 'PER_ITEM',
ALTER COLUMN "itemType" DROP NOT NULL;

-- Marcar pesquisas pré-existentes como modo legado (elas foram criadas no fluxo antigo por contrato).
UPDATE "price_researches" SET "mode" = 'CONTRACT_LEGACY' WHERE "createdAt" < NOW();

-- AlterTable
ALTER TABLE "price_samples" ADD COLUMN     "legalRegimeInferred" "LegalRegime",
ADD COLUMN     "researchItemId" TEXT;

-- CreateTable
CREATE TABLE "price_research_items" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "contractItemId" TEXT NOT NULL,
    "itemType" "ResearchItemType" NOT NULL,
    "catmatCode" TEXT,
    "catserCode" TEXT,
    "codeSource" "CodeSource" NOT NULL DEFAULT 'PENDING',
    "codeDescricao" TEXT,
    "codeTrail" JSONB,
    "mean" DECIMAL(15,2),
    "median" DECIMAL(15,2),
    "minValue" DECIMAL(15,2),
    "maxValue" DECIMAL(15,2),
    "stdDev" DECIMAL(15,2),
    "coefVariation" DECIMAL(8,4),
    "sampleCountTotal" INTEGER NOT NULL DEFAULT 0,
    "sampleCountUsed" INTEGER NOT NULL DEFAULT 0,
    "justificationText" TEXT,
    "justificationEditedAt" TIMESTAMP(3),
    "queriedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_research_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_research_items_researchId_idx" ON "price_research_items"("researchId");

-- CreateIndex
CREATE INDEX "price_research_items_contractItemId_idx" ON "price_research_items"("contractItemId");

-- CreateIndex
CREATE UNIQUE INDEX "price_research_items_researchId_contractItemId_key" ON "price_research_items"("researchId", "contractItemId");

-- CreateIndex
CREATE INDEX "price_researches_mode_idx" ON "price_researches"("mode");

-- CreateIndex
CREATE INDEX "price_samples_researchItemId_idx" ON "price_samples"("researchItemId");

-- AddForeignKey
ALTER TABLE "price_research_items" ADD CONSTRAINT "price_research_items_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "price_researches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_research_items" ADD CONSTRAINT "price_research_items_contractItemId_fkey" FOREIGN KEY ("contractItemId") REFERENCES "contract_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_samples" ADD CONSTRAINT "price_samples_researchItemId_fkey" FOREIGN KEY ("researchItemId") REFERENCES "price_research_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
