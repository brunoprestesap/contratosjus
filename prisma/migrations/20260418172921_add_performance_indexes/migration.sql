-- CreateIndex
CREATE INDEX "contracts_supplierCnpj_idx" ON "contracts"("supplierCnpj");

-- CreateIndex
CREATE INDEX "contracts_legalRegime_idx" ON "contracts"("legalRegime");

-- CreateIndex
CREATE INDEX "contracts_createdAt_idx" ON "contracts"("createdAt");
