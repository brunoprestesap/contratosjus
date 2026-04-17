import type { AdditiveInput } from "@/lib/validators/aditivo";

interface ContractSnapshot {
  globalValue: { toString(): string };
  endDate: Date;
  estimatedMonthlyValue: { toString(): string } | null;
}

export interface AdditivePreview {
  before: {
    globalValue: number;
    endDate: Date;
    monthlyValue: number | null;
  };
  after: {
    globalValue: number;
    endDate: Date;
    monthlyValue: number | null;
  };
}

export function generateAdditivePreview(
  contract: ContractSnapshot,
  data: AdditiveInput
): AdditivePreview {
  const currentGlobal = Number(contract.globalValue.toString());
  const currentEnd = new Date(contract.endDate);
  const currentMonthly = contract.estimatedMonthlyValue
    ? Number(contract.estimatedMonthlyValue.toString())
    : null;

  return {
    before: {
      globalValue: currentGlobal,
      endDate: currentEnd,
      monthlyValue: currentMonthly,
    },
    after: {
      globalValue: data.newGlobalValue ?? currentGlobal,
      endDate: data.newEndDate ?? currentEnd,
      monthlyValue: data.newMonthlyValue ?? currentMonthly,
    },
  };
}
