-- Amostras com o mesmo `pncpNumeroControle` são frequentemente retornadas
-- por CATSER comum a múltiplas pesquisas de preços (ex.: serviço de
-- vigilância em contratos paralelos). Unique global causava perda
-- silenciosa — `createMany(skipDuplicates: true)` pulava a inserção da
-- segunda pesquisa. Trocamos para unique composto por `researchId`.

-- DropIndex
DROP INDEX "price_samples_pncpNumeroControle_key";

-- CreateIndex
CREATE UNIQUE INDEX "price_samples_researchId_pncpNumeroControle_key"
ON "price_samples"("researchId", "pncpNumeroControle");
