-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM (
  'UN', 'CX', 'KG', 'G', 'TON', 'L', 'ML', 'M', 'CM', 'MM',
  'M2', 'M3', 'MES', 'DIA', 'HORA', 'ANO', 'H_H', 'HOMEM_MES',
  'POSTO', 'PAR', 'DZ', 'PC', 'RL', 'GL', 'PCT', 'KIT', 'JG',
  'LOTE', 'VERBA', 'SERVICO', 'FL', 'FR', 'AMPOLA', 'TUBO',
  'UND_MEDICA', 'OTHER'
);

-- Rename old column and add new columns
ALTER TABLE "contract_items" RENAME COLUMN "unitOfMeasure" TO "unitOfMeasureLegacy";
ALTER TABLE "contract_items" ADD COLUMN "unitOfMeasure" "UnitOfMeasure";
ALTER TABLE "contract_items" ADD COLUMN "unitOfMeasureOther" TEXT;

-- Backfill: mapear strings conhecidas para enum, resto vai para OTHER
UPDATE "contract_items" SET
  "unitOfMeasure" = CASE
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('UN', 'UND', 'UNID', 'UNIDADE', 'UNIDADES') THEN 'UN'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('CX', 'CAIXA', 'CAIXAS') THEN 'CX'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('KG', 'QUILO', 'QUILOGRAMA', 'QUILOS') THEN 'KG'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('G', 'GR', 'GRAMA', 'GRAMAS') THEN 'G'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('TON', 'T', 'TONELADA', 'TONELADAS') THEN 'TON'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('L', 'LT', 'LITRO', 'LITROS') THEN 'L'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('ML', 'MILILITRO', 'MILILITROS') THEN 'ML'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('M', 'MT', 'METRO', 'METROS') THEN 'M'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('CM', 'CENTIMETRO', 'CENTÍMETRO') THEN 'CM'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('MM', 'MILIMETRO', 'MILÍMETRO') THEN 'MM'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('M2', 'M²', 'METRO QUADRADO') THEN 'M2'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('M3', 'M³', 'METRO CUBICO', 'METRO CÚBICO') THEN 'M3'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('MES', 'MÊS', 'MESES') THEN 'MES'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('DIA', 'DIAS') THEN 'DIA'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('HORA', 'HORAS', 'H', 'HS', 'HRS') THEN 'HORA'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('ANO', 'ANOS') THEN 'ANO'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('H/H', 'HH', 'HOMEM-HORA', 'HOMEM/HORA') THEN 'H_H'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('HOMEM/MES', 'HOMEM-MES', 'HOMEM/MÊS', 'HOMEMMES') THEN 'HOMEM_MES'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('POSTO', 'POSTOS', 'POSTO DE SERVICO', 'POSTO DE SERVIÇO') THEN 'POSTO'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('PAR', 'PARES') THEN 'PAR'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('DZ', 'DUZIA', 'DÚZIA', 'DUZIAS') THEN 'DZ'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('PC', 'PECA', 'PEÇA', 'PECAS', 'PEÇAS') THEN 'PC'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('RL', 'ROLO', 'ROLOS') THEN 'RL'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('GL', 'GALAO', 'GALÃO', 'GALOES') THEN 'GL'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('PCT', 'PCTE', 'PACOTE', 'PACOTES') THEN 'PCT'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('KIT', 'KITS') THEN 'KIT'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('JG', 'JOGO', 'JOGOS') THEN 'JG'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('LOTE', 'LOTES') THEN 'LOTE'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('VERBA', 'VB') THEN 'VERBA'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('SERV', 'SERVICO', 'SERVIÇO', 'SERVICOS') THEN 'SERVICO'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('FL', 'FOLHA', 'FOLHAS') THEN 'FL'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('FR', 'FRASCO', 'FRASCOS') THEN 'FR'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('AMPOLA', 'AMP', 'AMPOLAS') THEN 'AMPOLA'::"UnitOfMeasure"
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN ('TUBO', 'TB', 'TUBOS') THEN 'TUBO'::"UnitOfMeasure"
    ELSE 'OTHER'::"UnitOfMeasure"
  END,
  "unitOfMeasureOther" = CASE
    WHEN UPPER(TRIM("unitOfMeasureLegacy")) IN (
      'UN', 'UND', 'UNID', 'UNIDADE', 'UNIDADES',
      'CX', 'CAIXA', 'CAIXAS',
      'KG', 'QUILO', 'QUILOGRAMA', 'QUILOS',
      'G', 'GR', 'GRAMA', 'GRAMAS',
      'TON', 'T', 'TONELADA', 'TONELADAS',
      'L', 'LT', 'LITRO', 'LITROS',
      'ML', 'MILILITRO', 'MILILITROS',
      'M', 'MT', 'METRO', 'METROS',
      'CM', 'CENTIMETRO', 'CENTÍMETRO',
      'MM', 'MILIMETRO', 'MILÍMETRO',
      'M2', 'M²', 'METRO QUADRADO',
      'M3', 'M³', 'METRO CUBICO', 'METRO CÚBICO',
      'MES', 'MÊS', 'MESES',
      'DIA', 'DIAS',
      'HORA', 'HORAS', 'H', 'HS', 'HRS',
      'ANO', 'ANOS',
      'H/H', 'HH', 'HOMEM-HORA', 'HOMEM/HORA',
      'HOMEM/MES', 'HOMEM-MES', 'HOMEM/MÊS', 'HOMEMMES',
      'POSTO', 'POSTOS', 'POSTO DE SERVICO', 'POSTO DE SERVIÇO',
      'PAR', 'PARES',
      'DZ', 'DUZIA', 'DÚZIA', 'DUZIAS',
      'PC', 'PECA', 'PEÇA', 'PECAS', 'PEÇAS',
      'RL', 'ROLO', 'ROLOS',
      'GL', 'GALAO', 'GALÃO', 'GALOES',
      'PCT', 'PCTE', 'PACOTE', 'PACOTES',
      'KIT', 'KITS',
      'JG', 'JOGO', 'JOGOS',
      'LOTE', 'LOTES',
      'VERBA', 'VB',
      'SERV', 'SERVICO', 'SERVIÇO', 'SERVICOS',
      'FL', 'FOLHA', 'FOLHAS',
      'FR', 'FRASCO', 'FRASCOS',
      'AMPOLA', 'AMP', 'AMPOLAS',
      'TUBO', 'TB', 'TUBOS'
    ) THEN NULL
    ELSE "unitOfMeasureLegacy"
  END;

-- Drop legacy column and enforce NOT NULL
ALTER TABLE "contract_items" DROP COLUMN "unitOfMeasureLegacy";
ALTER TABLE "contract_items" ALTER COLUMN "unitOfMeasure" SET NOT NULL;
