export type ContractItemType = "MATERIAL" | "SERVICE" | "WORK" | "IT_SOLUTION";
export type ContractItemCatalogType = "CATMAT" | "CATSER";
export type ContractItemStatus = "ACTIVE" | "SUSPENDED" | "CANCELED";
export type ContractItemAdjustmentIndex =
  | "NONE"
  | "IPCA"
  | "IGPM"
  | "INCC"
  | "IPC_FIPE"
  | "SINAPI"
  | "OTHER";
export type ContractItemUnitOfMeasure =
  | "UN"
  | "CX"
  | "KG"
  | "G"
  | "TON"
  | "L"
  | "ML"
  | "M"
  | "CM"
  | "MM"
  | "M2"
  | "M3"
  | "MES"
  | "DIA"
  | "HORA"
  | "ANO"
  | "H_H"
  | "HOMEM_MES"
  | "POSTO"
  | "PAR"
  | "DZ"
  | "PC"
  | "RL"
  | "GL"
  | "PCT"
  | "KIT"
  | "JG"
  | "LOTE"
  | "VERBA"
  | "SERVICO"
  | "FL"
  | "FR"
  | "AMPOLA"
  | "TUBO"
  | "UND_MEDICA"
  | "OTHER";

export interface ContractItemView {
  id: string;
  itemNumber: string;
  lotNumber: string | null;
  itemType: ContractItemType;
  catalogType: ContractItemCatalogType;
  catalogCode: string | null;
  description: string;
  detailedSpecification: string;
  unitOfMeasure: ContractItemUnitOfMeasure;
  unitOfMeasureOther: string | null;
  quantity: { toString(): string };
  unitValue: { toString(): string };
  isAdjustable: boolean;
  adjustmentIndex: ContractItemAdjustmentIndex;
  nextAdjustmentDate: Date | null;
  budgetProgram: string | null;
  expenseNature: string | null;
  fundingSource: string | null;
  brand: string | null;
  model: string | null;
  manufacturer: string | null;
  countryOfOrigin: string | null;
  warrantyMonths: number | null;
  deliveryLocation: string | null;
  deliveryDeadlineDays: number | null;
  executionLocation: string | null;
  executionDeadlineDays: number | null;
  isContinuousService: boolean;
  penaltyRules: string | null;
  bdiPercentage: { toString(): string } | null;
  socialChargesPercentage: { toString(): string } | null;
  sinapiReference: string | null;
  pctiReference: string | null;
  itServiceCategory: string | null;
  status: ContractItemStatus;
  needsReview: boolean;
}
