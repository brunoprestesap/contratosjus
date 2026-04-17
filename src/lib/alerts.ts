import { getMissingPaymentMonths } from "@/lib/missing-payments";

export type AlertType = "EXPIRING" | "LOW_BALANCE" | "MISSING_PAYMENT";
export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  contractId: string;
  contractNumber: string;
  createdAt: string;
  read: boolean;
}

interface ContractForAlerts {
  id: string;
  contractNumber: string;
  status: string;
  endDate: Date | string;
  startDate: Date | string;
  globalValue: { toNumber?: () => number } | number;
  paymentType: string;
  paymentPeriodicity: string;
  payments: {
    paidValue: { toNumber?: () => number } | number | null;
    referenceMonth: Date | string;
  }[];
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function toNumber(value: { toNumber?: () => number } | number | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value.toNumber === "function") return value.toNumber();
  return Number(value);
}

export function generateAlerts(contracts: ContractForAlerts[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  for (const contract of contracts) {
    if (contract.status !== "ACTIVE") continue;

    const endDate = new Date(contract.endDate);
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // EXPIRING: vigência vencendo em até 90 dias
    if (diffDays >= 0 && diffDays <= 90) {
      let severity: AlertSeverity;
      if (diffDays < 30) {
        severity = "critical";
      } else if (diffDays < 60) {
        severity = "warning";
      } else {
        severity = "info";
      }

      alerts.push({
        id: `EXPIRING-${contract.id}`,
        type: "EXPIRING",
        severity,
        title: `Contrato ${contract.contractNumber}`,
        description: `Vigência vence em ${diffDays} dia${diffDays !== 1 ? "s" : ""}`,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        createdAt: now.toISOString(),
        read: false,
      });
    }

    // LOW_BALANCE: saldo abaixo de 20%
    const globalValue = toNumber(contract.globalValue);
    if (globalValue > 0) {
      const totalPaid = contract.payments.reduce(
        (sum, p) => sum + toNumber(p.paidValue),
        0
      );
      const remaining = globalValue - totalPaid;
      const remainingPercent = remaining / globalValue;

      if (remainingPercent < 0.2 && remainingPercent >= 0) {
        alerts.push({
          id: `LOW_BALANCE-${contract.id}`,
          type: "LOW_BALANCE",
          severity: "warning",
          title: `Contrato ${contract.contractNumber}`,
          description: `Saldo abaixo de 20% (${Math.round(remainingPercent * 100)}% restante)`,
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          createdAt: now.toISOString(),
          read: false,
        });
      }
    }

    // MISSING_PAYMENT: meses sem registro (FIXED + MONTHLY)
    const missingMonths = getMissingPaymentMonths(contract);
    if (missingMonths.length > 0) {
      alerts.push({
        id: `MISSING_PAYMENT-${contract.id}`,
        type: "MISSING_PAYMENT",
        severity: "warning",
        title: `Contrato ${contract.contractNumber}`,
        description: `${missingMonths.length} mês${missingMonths.length !== 1 ? "es" : ""} sem registro de pagamento`,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        createdAt: now.toISOString(),
        read: false,
      });
    }
  }

  // Ordenar por severidade (critical primeiro), depois por título
  alerts.sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.title.localeCompare(b.title);
  });

  return alerts;
}
