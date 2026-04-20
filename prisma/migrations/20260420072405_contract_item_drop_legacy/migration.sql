
-- AlterTable
ALTER TABLE "contract_items" DROP COLUMN "descricao",
DROP COLUMN "descricaoComplementar",
DROP COLUMN "grupoId",
DROP COLUMN "numeroItemCompra",
DROP COLUMN "quantidade",
DROP COLUMN "tipoId",
DROP COLUMN "tipoMaterial",
DROP COLUMN "valorTotal",
DROP COLUMN "valorUnitario",
ALTER COLUMN "catalogType" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "detailedSpecification" SET NOT NULL,
ALTER COLUMN "itemNumber" SET NOT NULL,
ALTER COLUMN "itemType" SET NOT NULL,
ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "totalValue" SET NOT NULL,
ALTER COLUMN "unitOfMeasure" SET NOT NULL,
ALTER COLUMN "unitValue" SET NOT NULL;

