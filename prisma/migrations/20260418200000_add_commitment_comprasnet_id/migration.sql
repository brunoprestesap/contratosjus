-- AlterTable
ALTER TABLE "commitments" ADD COLUMN "comprasnetId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "commitments_comprasnetId_key" ON "commitments"("comprasnetId");
